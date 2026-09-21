const logs = [];
const MAX_LOGS = 500;

function addLog(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const formattedMsg = `[${timestamp}] ${message}`;
  logs.push(formattedMsg);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  console.log(formattedMsg);
}

function getLogs() {
  return logs;
}

module.exports = {
  addLog,
  getLogs
};
