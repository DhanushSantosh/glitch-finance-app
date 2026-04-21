import { registerRootComponent } from 'expo';
import { initMobileSentry, wrapRootComponent } from './src/monitoring/sentry';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
initMobileSentry();

registerRootComponent(wrapRootComponent(App));
