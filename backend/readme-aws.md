# AWS EC2 Step-by-Step Deployment Guide for Nexo Chat Backend

This guide walks you through setting up an AWS EC2 instance from scratch, configuring it, cloning your code from GitHub, and running your NestJS backend securely using PM2.

---

## ⚠️ CRITICAL GOTCHAS (Read Before Proceeding)

If you have no prior AWS or deployment experience, please be aware of these two rules:

1. **The Vercel "Mixed Content" Block**:
   * If you host your frontend on Vercel, it will run on HTTPS (`https://your-app.vercel.app`).
   * Browsers **block** secure HTTPS sites from making API requests to insecure HTTP addresses (like `http://YOUR_EC2_PUBLIC_IP:3001`). This is called a **Mixed Content Error**.
   * **Solution**: You must point a domain name (like `api.nexozone.in`) to your EC2 instance and set up Nginx with a free SSL certificate (HTTPS) using Let's Encrypt. We have included these steps in **Phase 7**.

2. **Google OAuth IP Restrictions**:
   * Google's security rules **do not allow** raw IP addresses (like `http://54.210.12.34:3001/...`) in the **Authorized redirect URIs**.
   * Google only allows `http://localhost` (for local development) or real HTTPS domain names (like `https://api.nexozone.in/...`).
   * **Solution**: Setting up Nginx with SSL (Phase 7) is required if you want Google Login to work on your live server.

---

## Phase 1: Launch your EC2 Instance in AWS

An **EC2 Instance** is a virtual computer running in Amazon's data center. We will use a Linux (Ubuntu) server.

1. **Sign in to AWS**: Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. **Search for EC2**: In the top search bar, type **EC2** and click on the EC2 service.
3. **Launch Instance**: Click the orange **Launch Instance** button.
4. **Configure the Instance**:
   * **Name**: Set it to `nexo-chat-backend`.
   * **OS Image (AMI)**: Choose **Ubuntu** (Select **Ubuntu Server 24.04 LTS**, which is Free Tier Eligible).
   * **Instance Type**: Select **t2.micro** (or **t3.micro** depending on your region. Both are Free Tier Eligible and give you 1 GB of RAM for free).
   * **Key Pair (login)**: Click **Create new key pair**:
     * Key pair name: `nexo-key`
     * Key pair type: **RSA**
     * Private key file format: **.pem**
     * Click **Create key pair**. This downloads `nexo-key.pem` to your computer. **Save it in your Downloads folder** and do not delete it!
   * **Network Settings (Security Group)**:
     * Check **Allow SSH traffic from** -> Select **Anywhere** (Allows you to connect to the terminal from your PC).
     * Check **Allow HTTP traffic from the internet** (Allows normal website traffic on port 80).
     * Check **Allow HTTPS traffic from the internet** (Allows secure website traffic on port 443).
5. **Launch**: Click **Launch Instance** at the bottom right.
6. **Find Public IP**: Click **View all instances**. Wait for the status to show "Running", click on your instance, and copy the **Public IPv4 address** (e.g. `54.210.12.34`).

---

## Phase 2: Open Port 3001 on AWS (For direct backend access)

*Note: If you plan to set up Nginx + HTTPS (recommended), Nginx will run on port 80/443 and you won't need to expose port 3001 directly. However, it's good for initial testing.*

1. In the EC2 Console, click on your running instance.
2. Select the **Security** tab at the bottom, then click on the link under **Security groups** (e.g., `sg-0abc1234...`).
3. Click the **Edit inbound rules** button.
4. Click **Add rule** and configure:
   * **Type**: `Custom TCP`
   * **Port Range**: `3001`
   * **Source**: `Anywhere-IPv4` (`0.0.0.0/0`)
5. Click **Save rules**.

---

## Phase 3: Connect to EC2 from Windows PowerShell

Windows terminals protect key files very strictly. If your key file is "too open", AWS SSH will refuse to connect.

1. Open **PowerShell** on your Windows PC.
2. Navigate to your Downloads folder:
   ```powershell
   cd C:\Users\nirav\Downloads
   ```
3. Run these two commands to set the strict file permissions required by SSH:
   ```powershell
   # 1. Disable permission inheritance on the key file
   icacls .\nexo-key.pem /inheritance:r

   # 2. Grant read access ONLY to your current Windows user account
   icacls .\nexo-key.pem /grant:r "$($env:username):R"
   ```
4. Connect to your EC2 server (Replace `<YOUR_EC2_PUBLIC_IP>` with the public IP you copied in Phase 1):
   ```powershell
   ssh -i .\nexo-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```
5. Type `yes` and press Enter when asked to trust the host. You are now inside the Ubuntu Linux environment!

---

## Phase 4: Install Node.js, Git, and PM2 on the Server

Run these commands one by one inside your EC2 terminal:

1. **Update server package list**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. **Install Node.js (Version 20 LTS)**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Verify Installation**:
   ```bash
   node -v
   npm -v
   ```
4. **Install PM2 globally**:
   PM2 runs your Node/NestJS app in the background. Without it, your app will stop running as soon as you close PowerShell.
   ```bash
   sudo npm install -g pm2
   ```

---

## Phase 5: Clone your GitHub Repo and Set Up Files

1. **Clone the repository**:
   ```bash
   git clone https://github.com/niravkagathara/nexo-chat-app.git
   cd nexo-chat-app/backend
   ```

2. **Create the environment file (`.env`)**:
   Open the nano editor:
   ```bash
   nano .env
   ```
   Paste the following configuration. Change the database URL and credentials as needed:
   ```env
   # Database (SQLite)
   DATABASE_URL="file:./dev.db"

   # JWT
   JWT_SECRET="nexo_super_secret_jwt_key_2026_production"
   JWT_EXPIRES_IN="7d"

   # Email
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASS="your-gmail-app-password"
   EMAIL_FROM="Nexo Chat contact@yourdomain.com"

   # Google OAuth (Crucial: Read the Gotchas section. Domain is required for live login)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GOOGLE_CALLBACK_URL="https://api.yourdomain.com/auth/google/callback"

   # Frontend URL (Change to your actual production Vercel/Frontend URL)
   FRONTEND_URL="https://yourdomain.com"

   # Google Drive Backup
   GDRIVE_REFRESH_TOKEN="your-google-drive-refresh-token"
   ```
   *Press `Ctrl + O` and `Enter` to save. Press `Ctrl + X` to exit nano.*

3. **Create the Google Service Account Credentials file**:
   ```bash
   nano google-service-account.json
   ```
   Open your local `google-service-account.json` file, copy its text, paste it into nano, save (`Ctrl + O`, `Enter`), and exit (`Ctrl + X`).

---

## Phase 6: Run Migrations, Build, and Start your App

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Apply Database Schema (Prisma)**:
   This creates the SQLite database file (`dev.db`) on your server and creates all tables:
   ```bash
   npx prisma migrate deploy
   ```
3. **Build the production application**:
   
   > [!IMPORTANT]
   > **If the build crashes with `JavaScript heap out of memory` or `Allocation failed`**:
   > Free-tier EC2 instances (`t2.micro`/`t3.micro`) only have 1 GB of RAM, which is not enough memory to compile NestJS/TypeScript.
   >
   > 1. Make sure you have set up a **Swap file** (virtual RAM using SSD storage) if you haven't already:
   >    ```bash
   >    sudo fallocate -l 2G /swapfile
   >    sudo chmod 600 /swapfile
   >    sudo mkswap /swapfile
   >    sudo swapon /swapfile
   >    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   >    ```
   >
   > 2. By default, Node.js limits its memory usage based on the physical RAM size (~450MB) and will ignore your Swap file. You must explicitly tell Node.js to allow more memory usage during the build.
   >
   > Run this command to build:
   ```bash
   NODE_OPTIONS="--max-old-space-size=1536" npm run build
   ```
4. **Start the backend server using PM2**:
   ```bash
   pm2 start dist/src/main.js --name "nexo-backend"
   ```
5. **Set up auto-restart on system reboot**:
   ```bash
   pm2 startup
   ```
   *Copy the long command printed in the terminal, paste it, and run it.*
   Then save the configuration:
   ```bash
   pm2 save
   ```

---

## Phase 7: Set up Nginx Reverse Proxy & SSL (HTTPS) - RECOMMENDED

This phase solves both the **Vercel Mixed Content block** and the **Google OAuth redirect uri block**.

1. **DNS Setup**: Go to your domain registrar (GoDaddy, Namecheap, Route 53, etc.) and add an **A Record** pointing your domain (e.g. `api.nexozone.in`) to your EC2 instance's Public IPv4 address.
2. **Install Nginx & Certbot**:
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx -y
   ```
3. **Create Nginx Configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/nexo-chat
   ```
   Paste the following configuration:
   ```nginx
   server {
       listen 80;
       server_name api.nexozone.in; # Replace with your subdomain

       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           
           # Forward user IP details
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Socket.io WebSockets Support
       location /socket.io/ {
           proxy_pass http://127.0.0.1:3001/socket.io/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   *Save (`Ctrl + O`, `Enter`) and exit (`Ctrl + X`).*

4. **Enable Nginx Block**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/nexo-chat /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```
5. **Get Free SSL Certificate**:
   ```bash
   sudo certbot --nginx -d api.nexozone.in
   ```
   Follow the prompts (enter your email, accept terms, choose redirect). Nginx is now secured over HTTPS!

---

## PM2 & Server Management Cheat Sheet

*   **Check application status**: `pm2 status`
*   **View live log stream**: `pm2 logs nexo-backend`
*   **Restart the server**: `pm2 restart nexo-backend`
*   **Stop the server**: `pm2 stop nexo-backend`
*   **Nginx configuration check**: `sudo nginx -t`
*   **Restart Nginx**: `sudo systemctl restart nginx`
