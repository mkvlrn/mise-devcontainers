fpath=("$HOME/.config/zsh/completions" $fpath)
autoload -U compinit
compinit
export ZSH_AUTOSUGGEST_STRATEGY=(history completion)

# src
source "$HOME/.config/zsh/antidote.zsh"
source "$HOME/.config/zsh/completion.zsh"
source "$HOME/.config/zsh/alias.zsh"

# mise
eval "$(~/.local/bin/mise activate zsh)"

# oh-my-posh
omp_config="$HOME/repos/ts-tools/packages/config/src/mkvlrn.omp.jsonc"
[[ -f "$omp_config" ]] || omp_config="https://raw.githubusercontent.com/mkvlrn/ts-tools/main/packages/config/src/mkvlrn.omp.jsonc"
eval "$(oh-my-posh init zsh --config "$omp_config")"
