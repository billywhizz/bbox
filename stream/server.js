const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const videoFilePath = '/media/blue1/bbc/2020-04/The_Andrew_Marr_Show_-_2020-05-17_m000jbq9_original.mp4';

app.get('/video', (req, res) => {
  const fileSize = fs.statSync(videoFilePath).size;
  const { range } = req.headers;
  const [s, e] = range.replace('bytes=', '').split('-');
  const start = Number(s);
  const end = Number(e) || fileSize - 1;
  res.append('Accept-Ranges', 'bytes');
  res.append('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  res.append('Content-Length', end - start + 1);
  res.append('Content-Type', 'video/mp4');
  res.status(206);
  const fileStream = fs.createReadStream(videoFilePath, { start, end });
  fileStream.pipe(res);
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server is up...');
});
