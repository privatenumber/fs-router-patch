const fsRouterPatch = require('..');
const { Volume } = require('memfs');

test('should patch', () => {
	const middleware = jest.fn();

	const fs = new Volume();
	const router = new fsRouterPatch(fs);

	router.stat('/some-file', middleware);

	fs.stat('/some-file', function (err, data) {
		expect(middleware).toHaveBeenCalled();
	});

});

test('call multiple middleware', (cb) => {
	const middleware1 = jest.fn();
	const middleware2 = jest.fn();

	const fs = new Volume();
	new fsRouterPatch(fs)
		.stat('/:file', (req, res) => {
			middleware1();
		})
		.stat('/some-file', (req, res) => {
			middleware2();
		});

	fs.stat('/some-file', function (err, data) {
		expect(middleware1).toHaveBeenCalled();
		expect(middleware2).toHaveBeenCalled();
		cb();
	});
});

test('respond early', (cb) => {
	const middleware1 = jest.fn();
	const middleware2 = jest.fn();

	const fs = new Volume();
	const router = new fsRouterPatch(fs);

	router.stat('/:file', (req, res) => {
		middleware1();
		res.end({ someData: 1 });
	});

	router.stat('/some-file', (req, res) => {
		middleware2();
	});

	fs.stat('/some-file', function (err, data) {
		expect(err).toBe(null);
		expect(data.someData).toBe(1);
		expect(middleware1).toHaveBeenCalled();
		expect(middleware2).not.toHaveBeenCalled();
		cb();
	});
});

test('handle sync error', (cb) => {
	const middleware1 = jest.fn();
	const middleware2 = jest.fn();

	const fs = new Volume();
	const router = new fsRouterPatch(fs);

	router.stat('/:file', (req, res) => {
		middleware1();
		throw new Error('some error');
	});

	router.stat('/some-file', (req, res) => {
		middleware2();
	});

	fs.stat('/some-file', function (err, data) {
		expect(err).not.toBe(null);
		expect(err.message).toBe('some error');
		expect(middleware1).toHaveBeenCalled();
		expect(middleware2).not.toHaveBeenCalled();
		cb();
	});
});

test('handle async error', (cb) => {
	const middleware1 = jest.fn();
	const middleware2 = jest.fn();

	const fs = new Volume();
	const router = new fsRouterPatch(fs);

	router.stat('/:file', async (req, res) => {
		middleware1();
		throw new Error('some error');
	});

	router.stat('/some-file', (req, res) => {
		middleware2();
	});

	fs.stat('/some-file', function (err, data) {
		expect(err).not.toBe(null);
		expect(err.message).toBe('some error');
		expect(middleware1).toHaveBeenCalled();
		expect(middleware2).not.toHaveBeenCalled();
		cb();
	});
});

