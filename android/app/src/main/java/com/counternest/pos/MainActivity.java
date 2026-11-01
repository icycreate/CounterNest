package com.counternest.pos;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle state){registerPlugin(SecureSessionPlugin.class);super.onCreate(state);}
}
