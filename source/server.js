const HttpSimpler = require('./js/HttpSimpler')
const { readdir } = require('fs').promises;
const { resolve } = require('path');


const options = {
	port: 3001,
	hostname: '127.0.0.1',
	file_encoding: 'utf8',
	show_folder: true,
}

const server = HttpSimpler.createServer(options);

async function* getFiles(dir, unmask) {
	const dirents = await readdir(dir, { withFileTypes: true });
	for (const dirent of dirents) {
		const res = `${dir}/${dirent.name}`;
		if (dirent.isDirectory()) {
			yield* getFiles(res, unmask);
		} else if (!unmask.test(res)) {
			yield {
				dir:dir, 
				file: res,
			};
		}
		
	}
}

server.get('/getTasksList', async function(req, res) {
	const fileStuff = [];
	const response = {};
	for await (const file of getFiles('./src/photos', /.txt$/)) {
		fileStuff.push(file);
	}
	fileStuff.forEach((v) => {
		if (!(v.dir in response)) {
			response[v.dir] = [];
		}
		response[v.dir].push(v.file);
	})
	res.write(JSON.stringify(response));
	res.end(); 
});

server.listen();