PATH := ./node_modules/.bin:${PATH}
test:
	npm install && mocha
.PHONY: test
