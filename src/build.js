import URL from "url";
import fs from "fs";
import path from "path";
import axios from "axios";
import cheerio from "cheerio";
import rimraf from "rimraf";
import Utils, { md5, fileType } from "./utils";

export default class Build {
  constructor(entry, rule, pathName, header, replace) {
    this.waitList = [entry];
    this.pathMap = {};
    this.errorMap = {};
    this.entry = entry;
    this.rule = rule || entry || '';
    this.header = JSON.parse(header || '{}');
    this.replace = replace;
    this.dirpath = path.join(__dirname, `../dist/${pathName || md5.b64(this.entry)}`);
    this.initDir();
  }

  /**
   * 初始化文件夹
   */ 
  initDir() {
    try {
      fs.accessSync(this.dirpath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      fs.mkdirSync(this.dirpath, { recursive: true });
      fs.mkdirSync(path.resolve(this.dirpath, 'css'));
      fs.mkdirSync(path.resolve(this.dirpath, 'js'));
      fs.mkdirSync(path.resolve(this.dirpath, 'img'));
      fs.mkdirSync(path.resolve(this.dirpath, 'fonts'));
    }
  }

  /**
   * 开始抓取网站
   */ 
  async doBuild() {
    while (this.waitList.length > 0) {
      console.log(this.waitList.length);
      const unshift = this.waitList.shift();
      if (this.pathMap[unshift]) {
        continue;
      }
      await this.downloadFile(unshift);
    }
    
    return {
      code: 1,
      data: this.dirpath
    };
  }

  async downloadFile(url) {
    console.log(url);
    try {
      const fileName = this.getFileName(url);
      const isImg = fileType.isImage(url);
      const isFont = fileType.isFont(url);
      const isCss = fileType.isCss(url);

      const result = await axios.get(url, {
        headers: this.header,
        responseType: isImg || isFont ? 'stream' : 'text',
        timeout: 10000,
        transformResponse: data => data
      });

      const ct = result.headers['content-type'];
      let data = result.data;
      if (ct.includes('text/html')) {
        return await this.saveHtml(this.getFileName(url, true), data, url);
      } else if (isImg || isFont) {
        data.pipe(fs.createWriteStream(path.join(this.dirpath, fileName)));
      } else if (isCss) {
        data = data.replace(/url\(['"]*([a-zA-Z0-9\-&#\?=_:./]+)['"]*\)/g, (match, group) => {
          const link = this.addNewUrl(url, group);
          if (link) {
            return `url(../${this.getFileName(link)})`
          } else {
            return match
          }
        })
      }
      await this.saveFile(fileName, data);
      return this.pathMap[url] = fileName;
    } catch (error) {
      this.errorMap[url] = this.errorMap[url] ? (this.errorMap[url] + 1) : 1;
      console.log(error, url);
      return
    }
  }
  
  /**
   * 保存文件
   */
  async saveFile(fileName, data) {
    return fs.appendFileSync(path.join(this.dirpath, fileName), data, {
      // encoding: 'utf-8'
    })
  }
  
  /**
   * HTML分析保存
   */
  async saveHtml(fileName, data, url) {
    const $ = cheerio.load(data, {
      decodeEntities: false
    });
    const css = $('link[rel="stylesheet"]').toArray();
    const img = $('img').toArray();
    const script = $('script[src]').toArray();
    const herf = $('a').toArray();

    this.eachHtmlDom($, url, css, 'href');

    this.eachHtmlDom($, url, img, 'src');

    this.eachHtmlDom($, url, script, 'src');

    herf.forEach(item => {
      const link = item.attribs.href;

      if (!link || link == '/') { return };

      const abLink = this.addNewUrl(url, link, true);

      if (!abLink) { return };

      const abURL = new URL.URL(link, url);

      $(item).attr('href', `${this.getFileName(abLink, true)}${abURL.search}${abURL.hash}`);
    })
    this.saveFile(fileName, $.html());
    this.pathMap[url] = fileName;
    return
  }

  /**
   * 遍历html内部节点
   */ 
  eachHtmlDom($, baseUrl, arr = [], attrName = 'src') {
    arr.forEach(item => {
      const link = this.addNewUrl(baseUrl, $(item).attr(attrName));
      link && $(item).attr(attrName, this.getFileName(link));
    })
  }

  /**
   * 新增待下载资源链接
   */
  addNewUrl(baseUrl, url, b) {
    if (url.includes('base64')) {
      return false
    }
    const abURL = new URL.URL(url, baseUrl)
    const abLink = `${abURL.protocol}//${abURL.host}${abURL.pathname}`;
    if (b && abLink.indexOf(this.rule) == -1) {
      return false
    }
    if (!this.waitList.includes(abLink) && !(this.errorMap[abLink] && this.errorMap[abLink] > 2)) {
      this.waitList.push(abLink);
    }
    return abLink
  }
  
  /**
   * 获取文件保存的名称
   */
  getFileName(url, isHtml) {
    const pn = this.getPathname(url).split('/');
    const back = pn.length >= 0 ? pn.join('_') : 'index.html';
    if (isHtml && !back.endsWith('.html')) {
      return `${back}.html`
    }
    const type = fileType.getType(url);
    if (type) {
      return `${type}/${back}`
    }
    return back
  }
  
  /**
   * url的pathname
   */
  getPathname(url) {
    const u = URL.parse(url);
    return u.pathname || ''
  }
}