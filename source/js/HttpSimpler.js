"use strict";

// Warning! It work only with simple JSON Object.
class DeepSet extends Set {
	constructor(array=[]) {
		super();
		array.forEach((el) => this.add(el));
	}

	jsonCompare(first, second) {
		return JSON.stringify(first) === JSON.stringify(second);
	}

	add(newValue) {
		const jsonCompare = function(first, second) {
			return JSON.stringify(first) === JSON.stringify(second);
		}

		for (let oldValue of this) {
	        if (jsonCompare(oldValue, newValue)) {
	        	this.delete(oldValue);
	            break;
	        }
	    }
	    Set.prototype.add.call(this, newValue);
	}

}



const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const promisify = require('util').promisify;

const cl = console.log;

class HttpSimpler {

	requestsHandler = new Map();
	pathsSet = new DeepSet();
	server = null;

	port = 3000;
	hostname = '127.0.0.1';
	file_encoding = 'utf8';
	protocol = 'http';
	

	constructor(options) {
		this.port = options.port;
		this.hostname = options.hostname;
		this.file_encoding = options.file_encoding;
	}

	static createServer(options) {
		return new HttpSimpler(options);
	}

	listen() {
		this.server = http.createServer();
		this.server.on('request', this.requestsListener.bind(this.server, this));
		this.server.listen(this.port, this.hostname, () => {
			console.log(`Server running at http://${this.hostname}:${this.port}/`);
		});
	}

	addListener(path, method, func) {
		const req = {
			method: method,
			pathRegexp: new RegExp(path),
		};

		this.pathsSet.add(req);
		this.requestsHandler.set(req, func);
		console.dir(this.pathsSet);
	}

	get(path, func) {
		this.addListener(path, 'GET', func);
	}

	post(path, func) {
		this.addListener(path, 'POST', func);
	}

	checkFileExist(webPath) {
		const parsedUrl = url.parse(webPath);
		const pathname = `.${parsedUrl.pathname}`;
		return new Promise((resolve) => {
			fs.access(pathname, fs.constants.R_OK, (err) => {
				if (err) {
					resolve(false);
				} else {
					resolve(true);
				}
			});
		})
	}

	async isDirectory(path) {
		return (await promisify(fs.lstat)(path)).isDirectory();
	}

	renderSkeleton(head, body) {
		return `
			<!html>
				<head>
					${head}
				</head>
				<body>
					${body}
				</body>
			</html>
		`;
	}

	renderFolderTree(root, fileList) {
		let tree = '';
		fileList.forEach(({isDirectory, fileName}) => tree += `<li><a href='${this.protocol}://${this.hostname}:${this.port}/${root}/${fileName}'>${fileName} (${isDirectory})</a></li>`);
		return this.renderSkeleton('', `<ul>${tree}</ul>`)
	}

	async readdir(path) {
		return await Promise.all((await promisify(fs.readdir)(path)).map(async (fileName) => ({
			isDirectory: await this.isDirectory(`${path}/${fileName}`),
			fileName: fileName,
		})));
	}

	
	async requestsListener(self, req, res) {

		// const { headers, method, url } = req;

		let pathPoiner = null;

		for (const path of self.pathsSet.values()) {
			if (path.pathRegexp.test(req.url) && req.method == path.method) {
				pathPoiner = path;
				break;
			}
		}

		if (pathPoiner != null) {
			self.requestsHandler.get(pathPoiner)(req, res);
			return;
		}

		if (await self.checkFileExist(req.url)) {
			const parsedUrl = url.parse(req.url);
			const pathname = `.${parsedUrl.pathname}`;
			const ext = path.parse(pathname).ext;
			const filenameExtensionMap = {
				'.ico': 'image/x-icon',
				'.html': 'text/html',
				'.js': 'text/javascript',
				'.json': 'application/json',
				'.css': 'text/css',
				'.png': 'image/png',
				'.jpg': 'image/jpeg',
				'.wav': 'audio/wav',
				'.mp3': 'audio/mpeg',
				'.svg': 'image/svg+xml',
				'.pdf': 'application/pdf',
				'.doc': 'application/msword'
			};


			if (!await self.isDirectory(pathname)) {
				fs.readFile(pathname, function(err, data) {
					if(err) {
						res.statusCode = 500;
						res.write(`Error getting the file: ${err}.`);
						res.end();
					} else {
						res.statusCode = 200;
						res.setHeader('Content-type', filenameExtensionMap[ext] || 'text/plain');
						res.write(data);
						res.end();
					}
				});
				return;
			}

			res.statusCode = 200;
			res.setHeader('Content-type', 'text/html');
			res.write(self.renderFolderTree(pathname, await self.readdir(pathname)));
			res.end();
			return;
		}

		res.statusCode = 404;
		res.write(`Path ${self.pathname} not found!`);
		res.end();
		return;
	    
	};

}

module.exports =  HttpSimpler;