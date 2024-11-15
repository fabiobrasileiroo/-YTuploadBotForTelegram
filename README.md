# Telegram YouTube Video Downloader Bot

This project is a Telegram bot that allows downloading YouTube videos and sending them to a specified chat or group. It supports sending videos directly or splitting them into parts if the file is too large.
## Demonstration



https://github.com/user-attachments/assets/b8ba3b74-002a-454a-9426-c8320c377ebd



## Features

- **YouTube Video Download**: Downloads videos from a provided URL.
- **Telegram Delivery**: Sends the video to a configured chat or group.
- **Chunk Splitting**: Automatically splits videos into 10-minute parts if the file size exceeds 50 MB.
- **.env Configuration**: Sensitive credentials and settings are loaded from a `.env` file.

## Prerequisites

- Node.js
- FFmpeg (for video splitting)
- Telegram Bot Token
- Telegram chat or group ID

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/your-username/repository-name.git
   cd repository-name
