// skyCORS - CORS proxy server
//
// written by  Harrison Kong
// at          skyRoute66
//
// Version History
// ======================================
// 2021-02-27   1.00
// 2021-02-28   1.10  - SSL and HTTPS only
// 2026-06-22   2.2.2 - Modernized version
// 
// Usage
// ======================================
// https://server_URL:port?target=https://some-api-provider-site.com?param1=abc&param2=12345
// <---------your server---------><---the url you want to reach----><----parameters-------->

import fs from 'node:fs'
import express from 'express'
import cors from 'cors'

const cloudflareEnv = await getCloudflareEnv()

if (cloudflareEnv) {
    console.log("Running as Cloudflare worker ...")
}
else {
    console.log("NOT running as Cloudflare worker ...")
}

console.log(`Environment: ${process.env.NODE_ENV === "development" ? "development" : "production"}`)

const config = await getConfiguration()

// API Key is only used if origin is undefined
// Listening port is not used for Cloudflare workers
console.log(`API_KEY: ${config.API_KEY}`)
if (!cloudflareEnv) {
    console.log(`LISTENING_PORT: ${config.LISTENING_PORT}`)
}
console.log(`LOGFILE: ${config.LOGFILE}`)
// This can either be an array of origins (strings)
// or a single string as "*" = allow all domains
console.log("ALLOWED_ORIGINS:")
console.log(config.ALLOWED_ORIGINS)

const corsOptions = {
  origin: (origin, callback) => {

    let allowed = false

    // allow requests with no origin (like mobile apps, curl, or same-origin requests)
    if (!origin) {
        allowed = true
    }
    else {
        if (typeof config.ALLOWED_ORIGINS === 'string') {   // single string
            if (config.ALLOWED_ORIGINS === "*") {   // is a wildcard
                allowed = true
            }
            else {  // single string match
                allowed = (config.ALLOWED_ORIGINS === origin)
            }

        }   // array of strings
        else {  // if one of the strings matches
            allowed = config.ALLOWED_ORIGINS.includes(origin)
        }
    }

    // done with all tests, return the result

    if (allowed) {
        return callback(null, true)
    }
    else {
        const msg = 'The CORS policy for this site blocks access from the origin ' + origin
        console.log(`Unauthorized origin ${origin} blocked by CORS policy`)
        return callback(msg, false)        
    }
  }
}

function appendToLog(logEntry) {
    if (!cloudflareEnv) {
        fs.appendFile(config.LOGFILE, logEntry + "\n", function (err) {
            if (err) {
            console.log("WARNING: appendToLog failed: " + err)
            } 
        })
    }
    else {
        // TODO: add logging for CloudFlare worker if necessary
    }
}

async function getConfiguration() {

    if (cloudflareEnv) {
        // Cloudflare worker
        return {
            API_KEY:        cloudflareEnv.API_KEY,
            LOGFILE:        cloudflareEnv.LOGFILE,
            ALLOWED_ORIGINS: process.env.NODE_ENV === "development"? "*" : cloudflareEnv.ALLOWED_ORIGINS.split(",")
        }
    }
    else {
        // not Cloudflare worker
        await import('dotenv/config')
        return {
            API_KEY:                    process.env.API_KEY,
            LISTENING_PORT:             process.env.PORT,
            LOGFILE:                    process.env.LOGFILE,
            ALLOWED_ORIGINS: process.env.NODE_ENV === "development"? "*" : process.env.ALLOWED_ORIGINS.split(","),
            SSL_PUBLIC_KEY_LOCATION:    process.env.SSL_PUBLIC_KEY_LOCATION,
            SSL_CERT_LOCATION:          process.env.SSL_CERT_LOCATION,
        }        
    }
}

async function getCloudflareEnv() {
    try {
        // Dynamically import cloudflare so standard Node.js doesn't crash on boot
        const { env } = await import("cloudflare:workers")
        return env
  } catch {
        // Not running inside a Cloudflare worker environment
        return null
  }

}

function getTimeStamp() {

    const rawStamp = Date.now()
    const d = new Date(rawStamp)

    return d.toISOString()
}

function parsePayload(req_url) {

    // We need to get rid of the /?target= part, leaving us with the target url and parameters

    var payload = req_url.substr(9, req_url.length - 9)

    // We also need to substitute the first & for the remainder as a ?
    // because the /?target= part took the first ? and the rest of the url if the whole string
    // was formed programmatically instead of just piecing strings together
    //
    // E.g., ----&x=---&y=---  NOT okay, needs to become ----?x=---&y=---
    //       ----?x=---&y=---  OKAY
    //       ------&y=-------  NOT okay, needs to become ------?y=-------
    //       ------?x=-------  OKAY
    //       ----------------  OKAY

    const firstAmph = payload.indexOf("&")
    const firstPerc = payload.indexOf("?")

    if (firstPerc == -1 && firstAmph != -1) {
        payload = payload.replace("&", "?")
    }

    return payload
}

const app = express()

app.use(cors(corsOptions))

app.use((req, res, next) => {
    res.set('Vary', 'Origin')    // prevent cross-site leaking
    next()
})

app.get('', async (req, res) => {

    const urlAndParams = parsePayload(req.url)

    let ip = req.connection.remoteAddress
    if (ip.startsWith('::ffff:')) {     // convert to IPv4 address
        ip = ip.replace('::ffff:', '');
    }

    const logString = getTimeStamp() + " " + req.get('origin') + " " + ip + " " + urlAndParams

    console.log(logString)
    appendToLog(logString)

    if (urlAndParams === "wellbeingcheck") {
        return res.status(200).json({ type: 'Info', message: 'Server is alive' })
    }

    const targetUrl = new URL(urlAndParams)

    // if origin is undefined, check API key
    if (!req.headers.origin) {
        const apiKey = targetUrl.searchParams.get('apikey')
        if (!apiKey || apiKey !== config.API_KEY) {
            console.log(`Invalid API key ${apiKey} rejected`)            
            return res.status(401).json({ type: 'Error', message: 'A valid API key is required'})
        }
        else {  // get rid of the api key, not needed for target fetch
            console.log(`Valid API key ${apiKey} accepted`)            
            delete targetUrl.searchParams.delete('apikey')
        }
    }

    const response = await fetch(targetUrl)
  
    if (!response.ok) {
        return res.status(500).json({ type: 'Error', message: 'Failed to fetch the target URL: ' + urlAndParams })
    } else {
        const body = await response.text()
        res.send(body)
    }   

})

let exportHandler   // we need this because we cannot export inside an if else block

if (!cloudflareEnv) {
    const https = await import('node:https');
    https
        .createServer(
            {
                key:  fs.readFileSync(config.SSL_PUBLIC_KEY_LOCATION),
                cert: fs.readFileSync(config.SSL_CERT_LOCATION),
                ca:   fs.readFileSync(config.SSL_CERT_LOCATION)
            },
            app
        )
        .listen(config.LISTENING_PORT, () => {
             console.log(`skyCORS Proxy Server started, listening for HTTPS traffic on port ${config.LISTENING_PORT} ...`)
        })
}
else {
    const { httpServerHandler } = await import('cloudflare:node')
    // the next two lines MUST use the same port number
    app.listen(500)                                       // this port is only used by httpServerHandler
    exportHandler = httpServerHandler( { port: 500 } )    // this port is NOT what we are listening to
    // This port number is ignored in the production environment on Cloudflare
    // when in wranger dev we are listening to 8787
    // when in wranger deploy we are listening to 443 (no need to specify this port in URL)
    console.log(`skyCORS Proxy Server started listening for HTTPS traffic.`)
}

export default exportHandler
