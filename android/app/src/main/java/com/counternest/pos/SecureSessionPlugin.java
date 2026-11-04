package com.counternest.pos;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.KeyStore;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
@CapacitorPlugin(name="SecureSession")
public class SecureSessionPlugin extends Plugin {
 private javax.crypto.SecretKey key() throws Exception {KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);if(!store.containsAlias("counternest-session")){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder("counternest-session",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}return (javax.crypto.SecretKey)store.getKey("counternest-session",null);}
 @PluginMethod public void get(PluginCall call){try{String value=getContext().getSharedPreferences("secure-session",Context.MODE_PRIVATE).getString(call.getString("key"),null);JSObject result=new JSObject();if(value==null)result.put("value",org.json.JSONObject.NULL);else{String[] parts=value.split(":");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));result.put("value",new String(c.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8));}call.resolve(result);}catch(Exception e){call.reject("Secure session unavailable");}}
 @PluginMethod public void set(PluginCall call){try{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());String encoded=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(call.getString("value","").getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP);boolean ok=getContext().getSharedPreferences("secure-session",Context.MODE_PRIVATE).edit().putString(call.getString("key"),encoded).commit();if(ok)call.resolve();else call.reject("Secure session unavailable");}catch(Exception e){call.reject("Secure session unavailable");}}
 @PluginMethod public void remove(PluginCall call){getContext().getSharedPreferences("secure-session",Context.MODE_PRIVATE).edit().remove(call.getString("key")).commit();call.resolve();}
 @PluginMethod public void appearance(PluginCall call){getActivity().runOnUiThread(()->{boolean dark=call.getBoolean("dark",false);android.view.Window window=getActivity().getWindow();new androidx.core.view.WindowInsetsControllerCompat(window,window.getDecorView()).setAppearanceLightNavigationBars(!dark);window.setNavigationBarColor(android.graphics.Color.parseColor(dark?"#211b17":"#fff7ef"));call.resolve();});}
 @PluginMethod public void bind(PluginCall call){getContext().getSharedPreferences("push-binding",Context.MODE_PRIVATE).edit().putString("user",call.getString("user","")).commit();if(call.getString("user","").isEmpty())((android.app.NotificationManager)getContext().getSystemService(Context.NOTIFICATION_SERVICE)).cancelAll();call.resolve();}
}
