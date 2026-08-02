// Logs method, URL, and timestamp for every request
const logger = (req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
};

module.exports = logger;
