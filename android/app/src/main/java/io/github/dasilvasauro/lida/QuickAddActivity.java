package io.github.dasilvasauro.lida;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Janelinha do widget de adição rápida: um campo de texto com o teclado já aberto. Não abre o app
 * (é rápida mesmo com o Lida fechado): o texto vai para a fila (QuickStore) e o app o transforma em
 * tarefa, com o mesmo parser da adição rápida, quando abrir (ou na hora, se já estiver aberto).
 */
public class QuickAddActivity extends Activity {

    private EditText input;

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTitle(R.string.quick_add);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(20), dp(18), dp(20), dp(12));

        TextView title = new TextView(this);
        title.setText(R.string.quick_add);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        box.addView(title);

        input = new EditText(this);
        input.setHint(R.string.quick_hint);
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | InputType.TYPE_TEXT_FLAG_AUTO_CORRECT);
        input.setImeOptions(EditorInfo.IME_ACTION_DONE);
        input.setOnEditorActionListener((tv, action, ev) -> {
            if (action == EditorInfo.IME_ACTION_DONE || (ev != null && ev.getKeyCode() == KeyEvent.KEYCODE_ENTER && ev.getAction() == KeyEvent.ACTION_DOWN)) {
                save();
                return true;
            }
            return false;
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(10);
        box.addView(input, lp);

        TextView note = new TextView(this);
        note.setText(R.string.quick_note);
        note.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f);
        note.setAlpha(0.7f);
        box.addView(note);

        LinearLayout btns = new LinearLayout(this);
        btns.setOrientation(LinearLayout.HORIZONTAL);
        btns.setGravity(Gravity.END);
        Button cancel = new Button(this, null, android.R.attr.borderlessButtonStyle);
        cancel.setText(R.string.quick_cancel);
        cancel.setOnClickListener((x) -> finish());
        Button ok = new Button(this, null, android.R.attr.borderlessButtonStyle);
        ok.setText(R.string.quick_ok);
        ok.setOnClickListener((x) -> save());
        btns.addView(cancel);
        btns.addView(ok);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        bp.topMargin = dp(8);
        box.addView(btns, bp);

        setContentView(box);
        getWindow().setLayout((int) Math.min(getResources().getDisplayMetrics().widthPixels * 0.92, dp(480)), ViewGroup.LayoutParams.WRAP_CONTENT);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        input.requestFocus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        input.postDelayed(() -> {
            InputMethodManager im = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (im != null) im.showSoftInput(input, InputMethodManager.SHOW_IMPLICIT);
        }, 120);
    }

    private void save() {
        String text = input.getText().toString().trim();
        if (text.isEmpty()) {
            finish();
            return;
        }
        QuickStore.add(this, text);
        QuickWidget.refreshAll(this);
        boolean live = LidaWidgetPlugin.queueChanged();
        Toast.makeText(this, live ? R.string.quick_saved : R.string.quick_saved_later, Toast.LENGTH_SHORT).show();
        finish();
    }
}
