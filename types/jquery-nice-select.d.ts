import 'jquery';

declare module 'jquery-nice-select';

declare global {
  interface JQuery {
    niceSelect(method?: 'update' | 'destroy'): JQuery;
  }
}
