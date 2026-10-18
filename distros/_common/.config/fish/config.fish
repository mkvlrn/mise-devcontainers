# no greeting
set -g fish_greeting

# mise
$HOME/.local/bin/mise activate fish | source

if status is-interactive
    # oh-my-posh
    set -l omp_config "$HOME/repos/ts-tools/packages/config/extra/mkvlrn.omp.json"
    if not test -f "$omp_config"
        set omp_config "https://raw.githubusercontent.com/mkvlrn/ts-tools/main/packages/config/extra/mkvlrn.omp.json"
    end
    oh-my-posh init fish --config "$omp_config" | source

    # eza to ls
    alias ls 'eza --git --git-repos --group-directories-first'
    # repo eza to k
    alias k 'eza -la --git --git-repos --group-directories-first'
    # zeditor to zeditor
    alias zed zeditor
end
