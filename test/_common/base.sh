# test development environment
for tool in mise docker fish git ssh; do
    check "$tool is available" command -v "$tool"
done

# test docker-in-docker
check "docker-in-docker is available" docker info
