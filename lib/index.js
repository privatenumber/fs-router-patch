const { match } = require('path-to-regexp');

class fsRouter {
	constructor(fs) {
		this.fs = fs;
		this.routes = new Map();
	}

	register(method, path, middleware) {
		if (!this.routes.has(method)) {
			this.patchFs(method);
		}

		this.routes.get(method).push({
			path,
			pathTest: match(path),
			middleware,
		});
	}

	patchFs(method) {
		const router = this;

		const middlewares = [];
		this.routes.set(method, middlewares);

		const origFn = this.fs[method];
		const isSync = method.endsWith('Sync');

		if (isSync) {
			this.fs[method] = function (path) {
				const args = Array.from(arguments);

				const res = {
					resolve: null,
					data: null,
					end(data) {
						this.resolve();
						this.data = data;
					},
				};

				for (const mw of middlewares) {
					const match = mw.pathTest(path);
					if (!match) {
						continue;
					}

					const req = {
						params: match.params,
						path: match.path,
						args,
					};

					res.resolve = resolve;
					mw.middleware(req, res, resolve);

					if (res.data) {
						return res.data;
					}
				}

				return origFn.apply(this, arguments);
			};			
		} else {
			this.fs[method] = async function (path) {
				const args = Array.from(arguments);
				const cb = args.pop();

				const res = {
					resolve: null,
					data: null,
					end(data) {
						this.resolve();
						this.data = data;
					},
				};

				for (const mw of middlewares) {
					const match = mw.pathTest(path);
					if (!match) {
						continue;
					}

					const req = {
						params: match.params,
						path: match.path,
						args,
					};

					try {
						await new Promise(resolve => {
							res.resolve = resolve;
							mw.middleware(req, res, resolve);
						});						
					} catch(err) {
						return cb(err);
					}

					if (res.data) {
						return cb(null, res.data);
					}
				}

				return origFn.apply(this, arguments);
			};
		}
	}
}

['access', 'accessSync', 'appendFile', 'appendFileSync', 'chmod', 'chmodSync', 'chown', 'chownSync', 'createReadStream', 'createWriteStream', 'existsSync', 'lchmod', 'lchmodSync', 'lchown', 'lchownSync', 'lstat', 'lstatSync', 'mkdir', 'mkdirSync', 'open', 'opendir', 'opendirSync', 'openSync', 'readdir', 'readdirSync', 'readFile', 'readFileSync', 'readlink', 'readlinkSync', 'realpath', 'realpathSync', 'rmdir', 'rmdirSync', 'stat', 'statSync', 'truncate', 'truncateSync', 'unlink', 'unlinkSync', 'utimes', 'utimesSync']
	.forEach((method) => {
		fsRouter.prototype[method] = function (path, middleware) {
			this.register(method, path, middleware);
		};
	});

module.exports = fsRouter;
