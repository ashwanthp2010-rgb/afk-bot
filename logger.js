const logs = [];

function addLog(msg) {
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(entry);
  logs.push(entry);
  if (logs.length > 200) logs.shift();
}

function getLogs() {
  return logs;
}

module.exports = { addLog, getLogs };
