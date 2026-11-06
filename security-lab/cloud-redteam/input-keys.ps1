Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$configPath = Join-Path $PSScriptRoot '.env.local'
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Agent Canary Cloud Red Team - 本机 API 配置'
$form.Size = New-Object System.Drawing.Size(760, 620)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9)

function Add-Label($text, $x, $y, $width = 190) {
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $text; $label.Location = New-Object System.Drawing.Point($x, $y)
    $label.Size = New-Object System.Drawing.Size($width, 24)
    $form.Controls.Add($label)
}
function Add-TextBox($name, $value, $x, $y, $width = 480, $password = $false) {
    $box = New-Object System.Windows.Forms.TextBox
    $box.Name = $name; $box.Text = $value
    $box.Location = New-Object System.Drawing.Point($x, $y)
    $box.Size = New-Object System.Drawing.Size($width, 25)
    if ($password) { $box.UseSystemPasswordChar = $true }
    $form.Controls.Add($box)
    return $box
}

Add-Label '国模 API Key（新 Key）' 24 26
$llmKey = Add-TextBox 'llmKey' '' 220 24 500 $true
Add-Label 'GPT API Key（新 Key）' 24 66
$gptKey = Add-TextBox 'gptKey' '' 220 64 500 $true
Add-Label '国模 Base URL' 24 106
$llmBase = Add-TextBox 'llmBase' 'https://api.yicode.ai/v1' 220 104 500
Add-Label 'GPT Base URL' 24 146
$gptBase = Add-TextBox 'gptBase' 'https://api.yicode.ai/v1' 220 144 500
Add-Label '攻击生成模型列表' 24 186
$attackModels = Add-TextBox 'attackModels' 'llm:deepseek-v4.1-flash,llm:glm-5.3,llm:glm-5.3-flash,llm:mimo-v2.6-pro,llm:kimi-k3.1-pro,llm:minimax-m3.1-flash,gpt:gpt-6.1-sol' 220 184 500
Add-Label '被测防御模型' 24 226
$defender = Add-TextBox 'defender' 'gpt:gpt-6.1-sol' 220 224 500
Add-Label 'Judge 模型' 24 266
$judge = Add-TextBox 'judge' 'llm:glm-5.3' 220 264 500
Add-Label '测试预算 USD' 24 306
$budget = Add-TextBox 'budget' 'unlimited' 220 304 500
Add-Label '最大并发请求' 24 346
$concurrency = Add-TextBox 'concurrency' '2' 220 344 500
Add-Label '首轮批次' 24 386
$batch = New-Object System.Windows.Forms.ComboBox
$batch.DropDownStyle = 'DropDownList'; $batch.Items.AddRange(@('100','1000','10000'))
$batch.SelectedIndex = 0; $batch.Location = New-Object System.Drawing.Point(220,384)
$batch.Size = New-Object System.Drawing.Size(160,25); $form.Controls.Add($batch)

$note = New-Object System.Windows.Forms.Label
$note.Text = 'Key 字段已遮蔽。预算可填美元金额或 unlimited。保存到本机 .env.local（Git 忽略）；不会调用 API。请勿输入已在聊天中发送过的旧 Key。'
$note.Location = New-Object System.Drawing.Point(24, 430)
$note.Size = New-Object System.Drawing.Size(690, 48)
$note.ForeColor = [System.Drawing.Color]::DarkRed
$form.Controls.Add($note)

$save = New-Object System.Windows.Forms.Button
$save.Text = '保存本机配置'; $save.Location = New-Object System.Drawing.Point(550, 500)
$save.Size = New-Object System.Drawing.Size(170, 38)
$form.Controls.Add($save)
$save.Add_Click({
    if ([string]::IsNullOrWhiteSpace($llmKey.Text) -or [string]::IsNullOrWhiteSpace($gptKey.Text)) {
        [System.Windows.Forms.MessageBox]::Show($form,'请填写两把已轮换的新 Key。','缺少配置',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null
        return
    }
    if ($llmKey.Text.Contains("`n") -or $llmKey.Text.Contains("`r") -or $gptKey.Text.Contains("`n") -or $gptKey.Text.Contains("`r")) {
        [System.Windows.Forms.MessageBox]::Show($form,'Key 格式无效。','配置无效',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null
        return
    }
    $lines = @(
        '# Local only. This file is ignored by Git.'
        "LLM_API_BASE_URL=$($llmBase.Text.Trim())"
        "LLM_API_KEY=$($llmKey.Text)"
        "GPT_API_BASE_URL=$($gptBase.Text.Trim())"
        "GPT_API_KEY=$($gptKey.Text)"
        "ATTACKER_MODEL=$($attackModels.Text.Trim())"
        "DEFENDER_MODEL=$($defender.Text.Trim())"
        "JUDGE_MODEL=$($judge.Text.Trim())"
        "MAX_TEST_BUDGET_USD=$($budget.Text.Trim())"
        "MAX_CONCURRENT_REQUESTS=$($concurrency.Text.Trim())"
        'MAX_API_RETRIES=1'
        "TEST_BATCH_SIZE=$($batch.SelectedItem)"
        'MODEL_PRICING_JSON='
    )
    [System.IO.File]::WriteAllText($configPath, ($lines -join "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
    [System.Windows.Forms.MessageBox]::Show($form,'配置已保存在本机 Git 忽略文件中。此窗口没有发起 API 请求。','已保存',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
    $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.Close()
})

$form.Add_Shown({ $form.Activate() })
$null = $form.ShowDialog()
if ($form.DialogResult -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output 'LOCAL_CONFIG_SAVED; API keys were not printed.' }
