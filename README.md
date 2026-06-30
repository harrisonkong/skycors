# 🌐 skyCORS Proxy Server

A lightweight, **Node.js** CORS proxy server built to bypass Cross-Origin Resource Sharing (CORS) restrictions during development or production, when requests originate from web browsers.

## 🛠️ Features

- **CORS Header Injection:** Automatically sets `Access-Control-Allow-Origin` to incoming requests.
- **Dynamic Routing:** Dynamically proxies requests to any target URL passed via query parameters.
- **Lightweight:** Minimal dependencies ensuring fast execution and low memory overhead.
- **Controlled Access** you can choose to allow all origins or a list of allowed origins. Requests with undefined origins are only allowed in the development environment for testing. In production, these origins do not need a CORS proxy server.
- **Versatile:** Can run locally for development or on cloud platform virtual machines (e.g. **AWS**) or as **Cloudflare** workers.

## 📦 Installation

Follow these steps to set up the proxy server locally on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/harrisonkong/skycors
cd skycors
```

### 2. Install Dependencies
```bash
npm install
```

### 3. SSL Certificate
Since it uses secured connection (**https**), you will need a certificate and public key file. For development purpose, you can look into:

- [mkcert](https://github.com/Filosottile/mkcert)

	**OR**

- [Let's Encrypt](https://letsencrypt.org/)
 
### 4. Environment Configuration
Create a `.env` file in the root directory to configure your server port, allowed origins, and other parameters.

You can make a copy of `.env.sample` and modify it with your paramters. Follow the instructions in the comments.

Here's an example:

```env
# -------- NON-CLOUDFLARE VARIABLES STARTS HERE -------- #

# All the variables in this sections are not used by Cloudflare workers

PORT=500
SSL_CERT_LOCATION="/your-path-to/cert.pem"
SSL_PUBLIC_KEY_LOCATION="/your-path-to/cert-key.pem"

# Omit (commented out) = no logging
LOGFILE="./skycors-log.txt"

# -------- INCLUSION FOR CLOUDFLARE STARTS HERE -------- #

# All the variables after this point will be used for 
# ** BOTH ** Cloudflare workers ** AND ** non-Cloudflare workers

# Do not modify or remove the marker line above!

# an * indicates all origins are allowed (wildcard)
# separate multiple origins with commas
# This is ignored for local development environment, it will be assumed to be *
ALLOWED_ORIGINS="https://sample.com,https://www.sample.com"

```

## 🚀 Usage

### Start the Server

***Please note that you should use these commands to start the server.*** Otherwise, required environmental variables will not be passed on to the server and it might not work properly.**

```bash
# Start in production mode
npm start

# Start in production mode with pm2
npm run startpm2

# Start in development mode
npm run dev

# Start in development mode with pm2
npm run devpm2

# To stop pm2 instance
npm run killpm2

# To start MiniCloud instance
wrangler dev

# To deploy to Cloudflare
npm run wrangler-deploy
```

### Use the Server

##### Development Environments, not Cloudflare
The server will be running at `https://localhost:[port you specified in .env]`.

##### Development Environments, Miniflare
The server will be running at `https://localhost:8787`.

##### Production Environments, virtual machines
The server will be running at `https://[your_host_name]:[port you specified in .env`.

##### Production Environments, Cloudflare
The server will be running at `https://[assigned_or_custom_subdomain_name`.
It is actually listening to port 443 but it is the default port so you do not need to specify it.

### How to Make Requests

To route a blocked API request through this proxy, prepend the proxy URL to your target API endpoint:

```
https://server_URL:port?target=https://some-api-provider-site.com?param1=abc&param2=12345
<---------your server---------><---the url you want to reach----><----parameters-------->
```

Using a local non-Miniflare development environment `https://localhost:500` as examples:

#### Well Being Check Feature

`https://localhost:500?target=wellbeingcheck`

#### Try It with a Weather Site
Type this in a web browser address bar:

`https://localhost:500?target=https://www.7timer.info/bin/api.pl?lon=-118.243&lat=34.052&product=civil&output=json`

#### Test Drive: Example Fetch Request with code:

This is in ``test-drive.js``, be sure to change the port number to the one you are using.

```javascript
const proxyUrl  = 'https://localhost:500/'
const targetUrl = 'https://www.7timer.info/bin/api.pl?lon=-118.243&lat=34.052&product=civil&output=json'

const full_URL = proxyUrl + '?target=' + targetUrl + '&apikey=' + apikey
console.log(full_URL)

fetch(full_URL)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error))
```

Run this script with `node test-drive.js`.

**IMPORTANT**: You must run this sample script while specifying the root certificate location if you are using **mkcert**. Like this:

`NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" node test-drive.js`

You should see some json data returned.

This script will actually run just fine without using the CORS proxy server because CORS is a browser only restriction. But it demostrates how to use the server.

If you put this code in the code for a webpage, you will not need the API key as long as you specified `localhost` as your allowed origin.

## 🗓️ Version History

| Version | Date | Description | Author |
| :--- | :--- | :--- | :--- |
| v2.2.2 | 2026-06-22 | Initial release                                         | @harrisonkong |
| v2.2.3 | 2026-06-24 | Better format for the date time stamp in log entries    | @harrisonkong |
| v2.2.4 | 2026-06-29 | Restrict 'undefined' origins in production              | @harrisonkong |
| v2.2.5 | 2026-06-30 | Avoid exposing local parameters to production           | @harrisonkong |


## 🛑 Pull Requests & Issues

Thank you for looking at this project! Please note that **this repository does NOT accept external contributions, modifications, or pull requests.** This is because the project is a personal portfolio piece that reflects only my individual work.

Feel free to **fork** the repository if you want to make your own changes!


## 📄 License

Distributed under the ISC License. See `LICENSE` for more information.
