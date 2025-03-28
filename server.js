const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.'));

const LOG_FILE = 'spin_log.txt';

// Ensure log file exists
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
}

app.post('/log', (req, res) => {
    console.log('Received log request:', req.body); // Debug
    const result = req.body.result.replace('Winner: ', '').trim().toUpperCase();
    const entry = {
        time: new Date().toLocaleTimeString(),
        result: result
    };
    console.log('Prepared entry:', entry); // Debug
    const logData = `${result}\n`; // Clean format with just Light/Dark
    
    console.log('Writing log entry:', logData);
    fs.appendFile(LOG_FILE, logData, (err) => {
        if (err) {
            console.error('Log write error:', err);
            // Try creating file if it doesn't exist
            fs.writeFile(LOG_FILE, logData, (writeErr) => {
                if (writeErr) {
                    console.error('Failed to create log file:', writeErr);
                    return res.status(500).json({error: 'Logging system error'});
                }
                res.sendStatus(200);
            });
            return;
        }
        res.sendStatus(200);
    });
});

app.get('/logs', (req, res) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading log:', err);
            return res.json({logs: []});
        }
        const lines = data.trim().split('\n')
            .filter(line => {
                const cleanLine = line.trim();
                return cleanLine === 'LIGHT' || cleanLine === 'DARK';
            })
            .reverse()
            .slice(0, 5)
            .map(line => line.trim());  // Ensure clean formatting
        const logs = lines
            .filter(line => line === 'LIGHT' || line === 'DARK')
            .map(JSON.stringify); // Properly format each entry
        res.json({logs: JSON.parse(`[${logs.join(',')}]`)}); // Ensure valid JSON array
    });
});

app.listen(8000, () => {
    console.log('Server running on port 8000');
});