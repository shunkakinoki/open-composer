FROM ghcr.io/shunkakinoki/dotfiles:sha-d655c4a

# Use bash as shell for RUN commands
SHELL ["/bin/bash", "-c"]

# Fix git config permissions issue
RUN mkdir -p /home/runner/.config/git && \
    chown -R runner:runner /home/runner
