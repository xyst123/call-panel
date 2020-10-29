import React from 'react';
import {
  BrowserRouter as Router,
  Redirect,
  Switch,
  Route,
} from 'react-router-dom';

import CallPanel from '@/pages/CallPanel';

const defaultRoute = {
  path: '/main',
  component: CallPanel,
  title: '客户推荐',
  auth: true,
};
const routes = [defaultRoute];

export const Routes = () => (
  <Router routes={routes}>
    <Switch>
      <Route
        path="/"
        exact
        render={() => <Redirect to={defaultRoute.path} />}
      />
      {routes.map((route, index) => {
        const currentRoute = route.auth ? route : defaultRoute;
        return (
          <Route
            key={`route-${index}`}
            path={currentRoute.path}
            exact
            render={() => {
              const title = currentRoute.title;
              document.title = title;
              return <currentRoute.component title={title} />;
            }}
          />
        );
      })}
    </Switch>
  </Router>
);
