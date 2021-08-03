'use strict';

const hash = require('object-hash');
const express = require('express');
const unoconv = require('unoconv-promise');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const mimetype = require('mime-types');
const ffmpeg = require('fluent-ffmpeg');
const Mutex = require('async-mutex').Mutex
const gm = require('gm').subClass({
  imageMagick: true
});

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

const TEMP_FILE_PATH = '/tmp/files/'

const CACHE_FILE_PATH = '/tmp/cache/'

// FIXME: unoconv can't run in parallel see https://github.com/unoconv/unoconv/issues/225
const unoconvMutex = new Mutex()

// App
const app = express();

const downloadFileIfNotExist = (async (url, path) => {
  const response = await fetch(url);

  if (!response.ok) {
    console.log('bad request', response.status)
    const error = new Error(response.statusText)

    error.status = response.status

    throw error
  }

  const fileStream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);
    response.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
});

const resizeImage = (async (source, dest, width, height) => {
  await new Promise((resolve, reject) => {
    gm(source)
      .resize(width, height)
      .noProfile()
      .write(dest, function (err) {
        if (!err) {
          console.log('image resized');
          resolve()
        } else {
          reject(err)
        }
      });
  })
})

app.get('/preview-file/:fileUrl/:dimensions', async (req, res) => {
  const {
    fileUrl,
    dimensions
  } = req.params

  const [width, height] = dimensions.split('x')

  const fileName = path.basename(fileUrl)

  let filePath = TEMP_FILE_PATH + fileName

  const cacheHash = hash({
    fileName,
    dimensions
  })

  const cacheFilePath = CACHE_FILE_PATH + cacheHash + '.png'

  if (fs.existsSync(cacheFilePath)) {
    res.contentType('image/png');
    res.send(fs.readFileSync(cacheFilePath))

    return
  }

  if (fileUrl.startsWith('http')) {
    try {
      await downloadFileIfNotExist(fileUrl, filePath)
    } catch (error) {
      console.log('hey', error)
      console.error(error)
      if (error.status != undefined) {

        res.statusCode = error.status
        if (error.status == 404) {
          res.contentType('image/png');
          res.send(fs.readFileSync('./no-image-available.png'))
        } else {
          res.send(error.message)
        }
      } else {
        res.statusCode = 500
        res.send('Internal server error')
      }

      return
    }
  } else {
    filePath = `/storage/${fileUrl}`
  }

  const mimeType = mimetype.lookup(filePath)

  let fileType = 'other'

  if (mimeType.startsWith('image')) {
    fileType = 'image'
  } else if (mimeType.startsWith('video')) {
    fileType = 'video'
  } else if (mimeType.startsWith('audio')) {
    fileType = 'audio'
  } else {
    fileType = 'document'
  }

  try {
    if (fileType === 'image') {
      await resizeImage(filePath, cacheFilePath, width, height)
    } else if (fileType == 'document') {
      const release = await unoconvMutex.acquire();

      try {
        await unoconv
          .run({
            // 'user-profile': `/tmp/${fileName}.propfile`,
            file: filePath,
            output: cacheFilePath,
            export: "PageRange=1-1",

          })
      } catch (error) {
        release()
        throw error
      }

      release()

      await resizeImage(cacheFilePath, cacheFilePath, width, height)
    } else if (fileType === 'video') {
      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .on('end', () => {
            resolve()
          })
          .on('error', (error) => {
            console.log(error)
            reject(error)
          })
          .screenshot({
            count: 1,
            filename: cacheFilePath,
            size: `${width}x?`
          })
      })

    } else if (fileType === 'audio') {
      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .complexFilter([
            `showwavespic=s=${dimensions}:colors=black`,
          ])
          .on('end', () => {
            resolve()
          }).on('error', (error) => {
            console.log(error)
            reject(error)
          })
          .save(cacheFilePath)
      })

    }


    res.contentType('image/png');
    res.send(fs.readFileSync(cacheFilePath))
  } catch (error) {
    console.error(error)

    res.statusCode = 500
    res.send(error.message)
  }
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);