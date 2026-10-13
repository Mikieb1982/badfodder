package games.shootrabbits.mobile;
import android.os.Bundle;
import android.view.WindowManager;
import android.view.ViewGroup;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/** The packaged game owns navigation, input and save state. */
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { dispatch("badfodder-android-back"); }
        });
        if (bridge != null && bridge.getWebView() != null) {
            ViewCompat.setOnApplyWindowInsetsListener(bridge.getWebView(), (view, insets) -> {
                Insets safe = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
                ViewGroup.LayoutParams raw = view.getLayoutParams();
                if (raw instanceof ViewGroup.MarginLayoutParams) {
                    ViewGroup.MarginLayoutParams margins = (ViewGroup.MarginLayoutParams) raw;
                    if (margins.leftMargin != safe.left || margins.topMargin != safe.top || margins.rightMargin != safe.right || margins.bottomMargin != safe.bottom) {
                        margins.setMargins(safe.left, safe.top, safe.right, safe.bottom);
                        view.setLayoutParams(margins);
                    }
                }
                return WindowInsetsCompat.CONSUMED;
            });
        }
        immersive();
    }
    private void dispatch(String event) {
        if (bridge != null && bridge.getWebView() != null)
            bridge.getWebView().evaluateJavascript("window.dispatchEvent(new Event('" + event + "'));", null);
    }
    private void immersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) immersive(); else dispatch("badfodder-native-pause");
    }
    @Override public void onPause() {
        dispatch("badfodder-native-pause");
        if (bridge != null && bridge.getWebView() != null) bridge.getWebView().onPause();
        super.onPause();
    }
    @Override public void onResume() {
        super.onResume();
        if (bridge != null && bridge.getWebView() != null) bridge.getWebView().onResume();
        immersive();dispatch("badfodder-native-resume");
    }
}
