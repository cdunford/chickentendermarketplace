/**
 * @description List of static content routes.
 */
const statics = [
  {
    dir: 'public',
    mount: '/',
  },
  {
    dir: 'dynamicContent/avatars',
    mount: '/avatars',
  },
  {
    dir: 'node_modules/bootstrap/dist',
    mount: '/bootstrap',
  },
  {
    dir: 'node_modules/bootstrap-social',
    mount: '/bootstrap-social',
  },
  {
    dir: 'node_modules/jquery/dist',
    mount: '/jquery',
  },
  {
    dir: 'node_modules/simple-pagination.js',
    mount: '/simplePagination',
  },
  {
    dir: 'node_modules/moment',
    mount: '/moment',
  },
];

export default statics;
