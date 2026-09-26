fpath=("$ZDOTDIR/.config/zsh/completions" $fpath)

# Keep a long, persistent history and share new commands between Zsh sessions.
HISTFILE="$ZDOTDIR/.zsh_history"
HISTSIZE=100000
SAVEHIST=100000
setopt append_history
setopt inc_append_history
setopt share_history
setopt hist_ignore_dups
setopt hist_ignore_space
setopt extended_history

autoload -U compinit
compinit
export ZSH_AUTOSUGGEST_STRATEGY=(history completion)

# src
source "$ZDOTDIR/antidote.zsh"
source "$ZDOTDIR/completion.zsh"
source "$ZDOTDIR/alias.zsh"
source "$ZDOTDIR/functions.zsh"

# mise
eval "$(~/.local/bin/mise activate zsh)"

# oh-my-posh
omp_config="$HOME/repos/ts-tools/packages/config/src/mkvlrn.omp.jsonc"
[[ -f "$omp_config" ]] || omp_config="https://raw.githubusercontent.com/mkvlrn/ts-tools/main/packages/config/src/mkvlrn.omp.jsonc"
eval "$(oh-my-posh init zsh --config "$omp_config")"
