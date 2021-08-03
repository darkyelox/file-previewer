# 🔍 File previewer 🖼️

Simple file previewer service using ffmpeg, imageMagick and unoconv with LibreOffice for generate images from almost any file supported by these libraries.

It can accept a local file (relative to a volume) or a remote file using HTTP.

## 💡 Motivation

There are already some libraries and Docker images that do the same thing (and are more dynamic) but I wanted to create something new and simpler, furthermore it supports remote and local files using the same GET request.

## 🚀 Usage

It listens by using the port 8080 by default and uses a volume for search local files so simply run this as a container:

```console
$ docker run -p 8080:8080 -v /path/to/files/in/server:/storage:ro -d aorius/file-previewer
 ```

Then you can use the api GET /preview-file/(file path or http)/WIDTHxHEIGHT.

Examples:

* Using a local file path relative to the volume used in the run command:
    http://localhost:8080/preview-file/contests%2Fevidences%2Ftest.jpeg/300x180

    *Note:* You should note that the file parameter must be uri encoded (using `encodeURIComponent` for example) in this case the path of the file is **contests/evidences/test.jpeg** and is a file relative to **/path/to/files/in/server** so the full path of that file in the server is **/path/to/files/in/server/contests/evidences/test.jpeg**.

* Passing a remote file by url:

    http://localhost:8080/preview-file/https%3A%2F%2Ffile-examples-com.github.io%2Fuploads%2F2017%2F11%2Ffile_example_MP3_700KB.mp3/300x90

    *Note:* Again you must use the uri encoded url path.


*Note:* The document files like PDF and DOCX are processed in secuencial using a Mutex, this will be fixed in next commits.

## ✏️ TODO:
- ⬜️| Configuration by ENV.
- ⬜️| Support for GIF files.
- ⬜️| Enable concurrency for unoconv conversions because of [this issue](https://github.com/unoconv/unoconv/issues/225)

- ⬜️| More options for converting some kind of files (background color and line color for audio file waveform)
- ⬜️| Create APIs for especific files: Ex. /preview-document, /preview-image, etc. This could be a good idea for to be more dynamic.
- ⬜️| Implement a better cache mechanism. Right now the files are saved in a /tmp/cache folder without any configuration for expiressness.

## ❓ Maybe
- Right now the code is very simple. Using express an other nodejs libraries, if the project increase in complexity I could consider using python and a web framework like http://falconframework.org/ or something.

## PRs are welcome. 😄 

## Thanks to:
- [Unovconv](https://github.com/unoconv/unoconv)
- [FFmpeg](https://www.ffmpeg.org/)
- [ImageMagick](https://imagemagick.org/index.php)
