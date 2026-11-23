# no greeting
set -g fish_greeting

# mise
$HOME/.local/bin/mise activate fish | source

if status is-interactive
    # oh-my-posh
    oh-my-posh init fish --config "$HOME/.config/oh-my-posh/mkvlrn.omp.json" | source
    # eza to ls
    alias ls 'eza --git --git-repos --group-directories-first'
    # repo eza to k
    alias k 'eza -la --git --git-repos --group-directories-first'
    # zeditor to zeditor
    alias zed zeditor
end
