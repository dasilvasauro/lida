package io.github.dasilvasauro.lida;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins próprios do Lida precisam ser registrados antes de a ponte iniciar.
        registerPlugin(LidaWidgetPlugin.class);
        registerPlugin(LidaTimerPlugin.class);
        registerPlugin(LidaAppPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
