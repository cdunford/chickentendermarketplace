import { dust } from 'adaro';
import * as Agenda from 'agenda';
import * as bodyParser from 'body-parser';
import flash = require('connect-flash');
import connectMongo = require('connect-mongodb-session');
import * as express from 'express';
import * as session from 'express-session';
import * as mongoose from 'mongoose';
import * as morgan from 'morgan';
import * as passport from 'passport';
import { join } from 'path';
import { setTimeout } from 'timers';
import config from './config';
import { IRouteConfig, IRouter } from './routing';
import { upgradeDatabase } from './upgrade';

(mongoose as any).Promise = global.Promise;

const mongoConnectionOptions = {
  useNewUrlParser: true,
  autoReconnect: true,
  reconnectTries: Number.MAX_SAFE_INTEGER,
  reconnectInterval: 5000,
};

const mongooseConnect = () => {
  return mongoose.connect(config.dbUri, mongoConnectionOptions)
    .catch(() => setTimeout(() => mongooseConnect(), 5000));
};

mongooseConnect();

config.dbCollections.forEach((collection) => {
  mongoose.connection.createCollection(collection);
});

const app = express();
app.set('views', `${__dirname}/views`);

type dustHelpFunction = (dust: any) => void;
const dustHelpers: Array<string | dustHelpFunction> = ['dustjs-helpers'];
for (const helper of config.dustHelpers) {
  dustHelpers.push((dustFramework) => {
    dustFramework.helpers[helper.name] = helper.function;
  });
}

app.engine('dust', dust({
  helpers: dustHelpers,
}));
app.set('view engine', 'dust');

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

const MongoStore = connectMongo(session);

const agenda = new Agenda({
  db: {
    address: config.dbUri,
    collection: 'agenda',
    options: mongoConnectionOptions,
  },
}).processEvery(60000);

agenda.on('error', (err) => {
  config.logger.error(`Agenda error: ${err}`);
});

agenda.start();

config.morganTokenFunctions.forEach((token) => {
  morgan.token(token.name, token.func);
});
app.use(morgan(config.morganFormat));

app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(flash());

for (const staticRoute of config.statics) {
  app.use(staticRoute.mount, express.static(join(__dirname, staticRoute.dir)));
}

app.use((req, res, next) => {
  res.locals.path = req.path.replace(/\/+$/, '');
  next();
});

app.get('/', (req, res) => {
  res.redirect('/app');
});

app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: config.sessionSecret,
  store: new MongoStore({
    uri: config.dbUri,
    collection: config.sessionCollection,
    connectionOptions: mongoConnectionOptions,
  }),
  cookie: {
    maxAge: config.sessionMaxAge,
    secure: process.env.NODE_ENV === 'production',
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.errors = req.flash('error');
  res.locals.infos = req.flash('info');
  res.locals.warnings = req.flash('warning');
  res.locals.successes = req.flash('success');

  next();
});

const appRouter = express.Router();

const routes: IRouteConfig[] = config.routes;

for (const routeDefinition of routes) {
  const router: IRouter = new routeDefinition.router({
    app: appRouter,
    passport,
    agenda,
  },
    routeDefinition.config,
  );
  router.registerRoutes(routeDefinition.mount);
}

app.use('/app', appRouter);

upgradeDatabase(config.dbMigration).then(() => app.listen(config.listenPort));
