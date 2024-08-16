# Deploying MERN Application With CI/CD Pipelines using Github Actions

### Getting started:

- Configure a VPS on any cloud provider (Digital Ocean in this case)
- ssh into the server using your ssh keys stored on your machine

```
# Create an ssh key
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# Login into your VPS
ssh -i ~/.ssh/PRIVATE_KEY_FILE_NAME USERNAME@SERVER_IP_ADDRESS
```

### Update System

```
sudo apt update
sudo apt upgrade
```

### Install Node.Js using NVM

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Install Nodejs using NVM
nvm install --lts
```

### Install git and github CLI

```
apt install git
apt install gh

# Login with github
gh auth login
```

### Install pm2 to run the application in backgroud

```
npm i -g pm2
pm2 start npm --name "name" -- start
pm2 list
pm2 logs name
pm2 delete all
pm2 save

// To test our backend
curl http://localhost:8000
```

### Getting started with Nginx

```
apt install nginx

# Start and Enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# some common directives
/etc/nginx/sites-available
/etc/nginx/sites-enabled
/var/www/html

# Some other commands
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl reload nginx
```

### Create .conf file

- Navigate to `/etc/nginx/sites-available`
- Create a file named after your IP-Address with an extension of .conf Like this: `192.0.0.0.conf`

```
# remove default file
rm default
# create a new file api.conf
Use nano as text editor by:
sudo nano 192.0.0.0.conf

server {
 listen 80;
 server_name _;

 location / {
    proxy_pass http://localhost:3000;
    limit_req zone=mylimit burst=20 nodelay;
    try_files $uri $uri/ /index.html =404;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    #Important For Cookies
    proxy_set_header X-Forwarded-Host $host;
    proxy_cookie_path / "/; Secure; HttpOnly; SameSite=None";
 }
 # If you dont have a domain name, justaddlike this, otherwise create separate files on the name of their domains
 location /api {
    proxy_pass http://localhost:3000;
    limit_req zone=mylimit burst=20 nodelay;
    try_files $uri $uri/ /index.html =404;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    #Important For Cookies
    proxy_set_header X-Forwarded-Host $host;
    proxy_cookie_path / "/; Secure; HttpOnly; SameSite=None";
 }
}
```

### Add Rate Limitting in Nginx

- Edit the file `sudo nano /etc/nginx/nginx.conf`

```
http {
    limit_req_zone $binary_remote_addr zone=mylimit:10m rate=2r/s;

    ...
}
```

### Create a symbolic link

- Navigate to `/etc/nginx/sites-enabled`

```
# Remove default file
rm default
# Create a symbolic link of the file we created.

ln -s ../sites-available/api.conf
```

- Test and Reload Nginx

```
sudo nginx -t
sudo systemctl reload nginx
```


# Auto-Deployment CI/CD Pipeline
```
name: Build And Deploy

on:
  push:
    branches:
      [ "main" ]

jobs:
    build-and-deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v2

            - name: Use Node.js 22.2.0
              uses: actions/setup-node@v2
              with:
                node-version: '22.2.0'

            - name: Install Dependencies (Client)
              run: |
                cd client
                npm ci
            
            - name: Install Dependencies (Server)
              run: |
                cd server
                npm ci
            

            - name: Build Client
              run: |
                cd client
                npm run build

            - name: Create client .env file
              run: |
                cd client
                echo "${{ secrets.CLIENT_ENV }}" > .env
          
            - name: Create server .env file
              run: |
                cd server
                echo "${{ secrets.SERVER_ENV }}" > .env

            - name: Deploy to DigitalOcean
              env: 
                SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
                SSH_USERNAME: ${{ secrets.SSH_USERNAME }}
                SSH_HOST: ${{ secrets.SSH_HOST }}
              run: |
                mkdir -p ~/.ssh/
                echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
                chmod 600 ~/.ssh/id_rsa
                ssh-keyscan -H $SSH_HOST >> ~/.ssh/known_hosts
                ssh -i ~/.ssh/id_rsa $SSH_USERNAME@$SSH_HOST 'echo SSH connection successful'
                rsync -avz --delete-after --quiet client/ $SSH_USERNAME@$SSH_HOST:~/MERN-CICD/client/
                rsync -avz --delete-after --quiet server/ $SSH_USERNAME@$SSH_HOST:~/MERN-CICD/server/
                ssh $SSH_USERNAME@$SSH_HOST '
                    export NVM_DIR="$HOME/.nvm" &&
                    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" &&
                    cd ~/MERN-CICD/client &&
                    npm install &&
                    npm run build &&
                    cd ../server &&
                    npm install &&
                    pm2 restart all
                '
```