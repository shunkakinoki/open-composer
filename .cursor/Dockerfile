FROM ghcr.io/shunkakinoki/dotfiles:sha-d655c4a

# Fix git config permissions issue
RUN mkdir -p /home/runner/.config/git && \
    chown -R runner:runner /home/runner/.config
