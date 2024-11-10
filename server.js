require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('youtube-dl-exec');
const TelegramBot = require('node-telegram-bot-api');
const ffmpeg = require('fluent-ffmpeg');

// Insira seu token do bot do Telegram aqui
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
// Substitua com o ID do chat ou grupo
const CHAT_ID = process.env.CHAT_ID;
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });


// Função para baixar e enviar o vídeo ou dividir em partes se for muito grande
async function downloadAndSendVideo(youtubeUrl) {
  console.log('Iniciando o download do vídeo...');

  try {
    // Obtendo informações do vídeo, incluindo título e descrição
    const info = await exec(youtubeUrl, { dumpSingleJson: true });
    const videoTitle = info.title ? info.title : ''; // Título padrão caso não tenha título
    const videoDescription = info.description ? info.description : ''; // Descrição padrão caso não tenha descrição
    const videoPath = path.resolve(__dirname, `${videoTitle}.mp4`);

    // Baixando o vídeo em formato e resolução menores
    await exec(youtubeUrl, {
      output: videoPath,
      format: 'mp4',
      f: '18',
      progress: true,
    });

    console.log('Download completo. Calculando tamanho do arquivo...');
    const stats = fs.statSync(videoPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`Tamanho do arquivo baixado: ${fileSizeInMB} MB`);

    if (fileSizeInMB <= 50) {
      await sendVideoToTelegram(videoPath, videoTitle, videoDescription, fileSizeInMB);
    } else {
      console.log('O vídeo é muito grande para envio direto. Dividindo em partes de 10 minutos...');
      await splitAndSendVideoParts(videoPath, videoTitle, videoDescription);
    }

    fs.unlinkSync(videoPath);
  } catch (error) {
    console.error('Erro ao baixar ou enviar o vídeo:', error);
  }
}

// Função para dividir o vídeo em partes de 20 minutos e enviar cada uma para o Telegram
async function splitAndSendVideoParts(videoPath, videoTitle, videoDescription) {
  const segmentDuration = 10 * 60; // 20 minutos em segundos
  const outputPattern = path.join(__dirname, `${videoTitle}_part_%03d.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        '-c copy',                   // Copia o codec original para evitar recodificação
        '-map 0',                    // Mapeia todos os streams
        `-segment_time ${segmentDuration}`,
        '-f segment',
      ])
      .output(outputPattern)
      .on('end', async () => {
        console.log('Divisão de vídeo completa. Enviando partes para o Telegram...');

        const partFiles = fs.readdirSync(__dirname).filter(file => file.startsWith(`${videoTitle}_part_`));
        for (let i = 0; i < partFiles.length; i++) {
          const partFile = partFiles[i];
          const partPath = path.resolve(__dirname, partFile);
          const partStats = fs.statSync(partPath);
          const partSizeInMB = (partStats.size / (1024 * 1024)).toFixed(2);

          // Define título numerado para cada chunk
          const chunkTitle = `${videoTitle}Parte ${i + 1}`;
          const options = {
            caption: `Título: ${chunkTitle}\nTamanho: ${partSizeInMB} MB\n\nDescrição: ${videoDescription}`
          };

          if (partSizeInMB <= 50) {
            await bot.sendVideo(CHAT_ID, partPath, options);
            console.log(`Parte enviada: ${partFile}`);
          } else {
            console.log(`Parte ${partFile} é muito grande para envio e foi ignorada.`);
          }

          fs.unlinkSync(partPath);
        }
        resolve();
      })
      .on('error', (err) => {
        console.error('Erro ao dividir o vídeo:', err);
        reject(err);
      })
      .run();
  });
}

// Função para enviar vídeo diretamente ao Telegram se ele estiver abaixo do limite
async function sendVideoToTelegram(videoPath, videoTitle, videoDescription, fileSizeInMB) {
  console.log('Enviando vídeo diretamente para o Telegram...');
  const truncatedDescription = videoDescription.length > 200 ? videoDescription.slice(0, 197) + '...' : videoDescription;
  const options = {
    caption: `Título: ${videoTitle}\nTamanho: ${fileSizeInMB} MB\n\nDescrição: ${truncatedDescription}`
  };

  await bot.sendVideo(CHAT_ID, videoPath, options);
  console.log(`Vídeo enviado para o Telegram: ${videoTitle}`);
}

// Escutar mensagens no Telegram para receber links de YouTube
bot.on('message', (msg) => {
  const youtubeUrl = msg.text;
  console.log('Recebendo mensagem...');

  if (/^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/.test(youtubeUrl)) {
    downloadAndSendVideo(youtubeUrl);
  } else {
    bot.sendMessage(msg.chat.id, "Por favor, envie um link válido do YouTube.");
  }
});
