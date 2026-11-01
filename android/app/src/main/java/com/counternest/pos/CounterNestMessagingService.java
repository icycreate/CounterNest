package com.counternest.pos;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.RemoteMessage;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import java.util.Map;
public class CounterNestMessagingService extends com.capacitorjs.plugins.pushnotifications.MessagingService {
 @Override public void onMessageReceived(RemoteMessage message){Map<String,String> d=message.getData();String user=d.get("user_id"),event=d.get("event_id"),record=d.get("record_id");if(user==null||event==null||record==null||!event.matches("[0-9a-f-]{36}")||!record.matches("[0-9a-f-]{36}"))return;
 android.content.SharedPreferences prefs=getSharedPreferences("push-binding",MODE_PRIVATE);if(!user.equals(prefs.getString("user","")))return;
 if(prefs.getBoolean("seen-"+event,false))return;
 // One OS notification per logical event. FCM itself remains at-least-once.
 if(prefs.getAll().size()>200){String binding=prefs.getString("user","");prefs.edit().clear().putString("user",binding).commit();}
 prefs.edit().putBoolean("seen-"+event,true).commit();
 PushNotificationsPlugin.sendRemoteMessage(message);
 ActivityManager.RunningAppProcessInfo info=new ActivityManager.RunningAppProcessInfo();ActivityManager.getMyMemoryState(info);if(info.importance==ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND&&!"true".equals(d.get("test")))return;
 NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
 if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("counternest-orders","CounterNest",NotificationManager.IMPORTANCE_HIGH));
 Intent intent=new Intent(this,MainActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse("counternest://"+("true".equals(d.get("test"))?"test":"order")+"/"+record+"?user="+user+"&event="+event)).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
 PendingIntent tap=PendingIntent.getActivity(this,event.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
 NotificationCompat.Builder n=new NotificationCompat.Builder(this,"counternest-orders").setSmallIcon(R.drawable.ic_stat_order).setContentTitle(d.getOrDefault("title","CounterNest")).setContentText(d.getOrDefault("body","Open CounterNest")).setContentIntent(tap).setAutoCancel(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
 try{manager.notify(event,event.hashCode(),n.build());}catch(SecurityException ignored){}
 }
}
