import type {CapacitorConfig} from '@capacitor/cli'
const config:CapacitorConfig={appId:'com.counternest.pos',appName:'CounterNest',webDir:'dist',server:{androidScheme:'https'},android:{allowMixedContent:false},plugins:{SystemBars:{insetsHandling:'native',initialViewportFitValueHint:'contain'},SplashScreen:{launchAutoHide:false,backgroundColor:'#fff7ef',androidSplashResourceName:'counternest_launch',showSpinner:false},Keyboard:{resizeOnFullScreen:true},PushNotifications:{presentationOptions:['badge','sound','alert']}}}
export default config
