import path from "path";
import Koa from 'koa';
import router from 'koa-router';
import serve from 'koa-static';
import koaBody from 'koa-body';
import open from 'open';
import Build from "./build";

const port = process.env.port || 4343;

class App {
  constructor() {
    this.init();
  }

  init() {
    this.app = new Koa();

    this.app.use(koaBody());
    this.app.use(serve(path.resolve(__dirname, '../static')));

    this.initRouter();

    this.app.listen(port);

    open(`http://localhost:${port}`)
  }

  initRouter() {
    this.router = router();

    this.router.post('/api/build', async (ctx, next) => {
      console.log(ctx.request.body);
      const { entry, rule = '', pathName = './', header } = ctx.request.body;
      if (!entry) {
        return await next()
      }
      ctx.type = 'json';
      try {
        const result = await new Build(entry, rule, pathName, header, true).doBuild();
        ctx.body = result;
      } catch (err) {
        console.log(err);
        ctx.body = {
          code: 0,
          msg: '请示失败'
        }
      }
    }, () => {
      ctx.body = {
        code: 0,
        msg: '请示失败'
      }
    })

    this.app.use(this.router.routes());
  }
}

const app = new App();