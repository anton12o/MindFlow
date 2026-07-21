.PHONY: run dev build setup clean

run:
	./start.sh

dev:
	cd frontend && npx vite --host

build:
	cd frontend && npm run build

setup:
	cd backend && pip install -r requirements.txt && cd ../frontend && npm install && npm run build

clean:
	rm -rf frontend/dist backend/__pycache__ backend/**/__pycache__ backend/.venv frontend/node_modules

install:
ifeq ($(shell uname -s),Linux)
	sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv nodejs npm || \
	sudo dnf install -y python3 python3-pip nodejs npm || \
	sudo pacman -S --noconfirm python python-pip nodejs npm || \
	echo "Pacote nao encontrado. Instale Python 3.10+ e Node 18+ manualmente."
endif
	make setup
