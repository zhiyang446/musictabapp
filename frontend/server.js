#!/usr/bin/env node

/**
 * Simple HTTP Server for Frontend
 * Serves static files for the Music Tab App frontend
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class FrontendServer {
    constructor(port = 3000) {
        this.port = port;
        this.mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
    }

    start() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        server.listen(this.port, () => {
            console.log(`🌐 Frontend server running on http://localhost:${this.port}`);
            console.log(`📁 Serving files from: ${__dirname}`);
            console.log(`🎵 Open http://localhost:${this.port} in your browser`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down frontend server gracefully');
            server.close(() => {
                console.log('Frontend server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down frontend server gracefully');
            server.close(() => {
                console.log('Frontend server closed');
                process.exit(0);
            });
        });

        return server;
    }

    handleRequest(req, res) {
        let filePath = req.url === '/' ? '/index.html' : req.url;
        
        // Remove query parameters
        filePath = filePath.split('?')[0];
        
        // Security: prevent directory traversal
        if (filePath.includes('..')) {
            this.sendError(res, 403, 'Forbidden');
            return;
        }

        const fullPath = path.join(__dirname, filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = this.mimeTypes[ext] || 'application/octet-stream';

        // Log request
        console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);

        // Check if file exists
        fs.access(fullPath, fs.constants.F_OK, (err) => {
            if (err) {
                this.sendError(res, 404, 'File not found');
                return;
            }

            // Read and serve file
            fs.readFile(fullPath, (err, data) => {
                if (err) {
                    this.sendError(res, 500, 'Internal server error');
                    return;
                }

                // Set CORS headers for API communication
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

                res.writeHead(200, {
                    'Content-Type': mimeType,
                    'Content-Length': data.length,
                    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
                });

                res.end(data);
            });
        });
    }

    sendError(res, statusCode, message) {
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error ${statusCode}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        min-height: 100vh;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                    }
                    .error-container {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 40px;
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                    }
                    h1 { font-size: 3rem; margin-bottom: 20px; }
                    p { font-size: 1.2rem; margin-bottom: 30px; }
                    a { 
                        color: #fff; 
                        text-decoration: none; 
                        background: rgba(255, 255, 255, 0.2);
                        padding: 10px 20px;
                        border-radius: 5px;
                        transition: background 0.3s;
                    }
                    a:hover { background: rgba(255, 255, 255, 0.3); }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>${statusCode}</h1>
                    <p>${message}</p>
                    <a href="/">← Back to Home</a>
                </div>
            </body>
            </html>
        `;

        res.writeHead(statusCode, {
            'Content-Type': 'text/html',
            'Content-Length': Buffer.byteLength(errorHtml)
        });

        res.end(errorHtml);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const port = process.env.FRONTEND_PORT || 3000;
    const server = new FrontendServer(port);
    server.start();
}

module.exports = FrontendServer;
