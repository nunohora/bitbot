#!/usr/bin/env python
# -*- coding:utf8 -*-
import urllib
import urllib2
import cookielib
import random
import logging
import json

from config import DEBUG, username, password

def log(s):
    if DEBUG:
        logging.warn(s)

class FXWebClient(object):
    WEB_URL = 'https://www.fxbtc.com/'
    Headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.3'}
    def __init__(self, username, password):
        self.cookie = cookielib.CookieJar()
        self.cookie_handler = urllib2.HTTPCookieProcessor(self.cookie)
        self.opener = urllib2.build_opener(self.cookie_handler)
        self.username = username
        self.password = password
    def __request(self, url, data):
        req = urllib2.Request(url=url, data=data, headers=self.Headers)
        resp = self.opener.open(req)
        return resp
    def __rand(self):
        return random.randint(1, 999999)
    def login(self):
        d = {}
        d['username'] = self.username
        d['password'] = self.password
        resp = self.__request(self.WEB_URL+'login?from=/', urllib.urlencode(d))
        return resp.getcode() == 200
    def __exchange(self, exchange_type, rate, count):
        if exchange_type not in ('ask', 'bid'):
            log('exchange_type is wrong')
            return False
        d = {}
        d['type'] = exchange_type
        d['symbol'] = 'btc_cny'
        d['rate'] = rate
        d['vol'] = count
        resp = self.__request('%sjport?op=exchange&c=%d'%(self.WEB_URL, self.__rand()), urllib.urlencode(d))
        result = resp.read()
        log('exchange result: ' + str(result))
        return json.loads(result)
    def buy(self, rate, count):
        return self.__exchange('ask', rate, count)
    def sell(self, rate, count):
        return self.__exchange('bid', rate, count)
class FXAPIClient(object):
    API_URL = 'https://trade.fxbtc.com/api'
    DATA_URL = 'https://data.fxbtc.com/api'
    def __init__(self, username, password):
        self.username = username
        self.password = password
    def __get(self, url):
        return self.__request(url)
    def __post(self, url, data):
        return self.__request(url, data)
    def __request(self, url, data=None):
        # error handle is a TODO
        result = urllib.urlopen(url, data).read()
        return json.loads(result)
    def login(self):
        d = {}
        d['op'] = 'get_token'
        d['username'] = 'eggfly'
        d['password'] = 'Lihaohuaasdf'
        body = json.dumps(d)
        result = self.__post(self.API_URL, body)
        log(result)
        self.token = result['token']
        return result['result']
    def query_ticker(self):
        return self.__get('%s?%s'%(self.DATA_URL, 'op=query_ticker&symbol=btc_cny'))
    def query_depth(self):
        return self.__get('%s?%s'%(self.DATA_URL, 'op=query_depth&symbol=btc_cny'))
    def query_last_trades(self, count):
        return self.__get('%s?%s'%(self.DATA_URL, 'op=query_last_trades&symbol=btc_cny&count=%d'%count))
    def query_history_trades(self, since):
        return self.__get('%s?%s'%(self.DATA_URL, 'op=query_history_trades&symbol=btc_cny&since=%d'%since))
    def buy(self, rate, count):
        return self.trade('buy', rate, count)
    def sell(self, rate, count):
        return self.trade('sell', rate,  count)
    def trade(self, trade_type, rate, count):
        if trade_type in ('buy', 'sell'):
            d = {}
            d['token'] = self.token
            d['op'] = 'trade'
            d['symbol'] = 'btc_cny'
            d['type'] = trade_type
            d['rate'] = rate
            d['vol'] = count
            result = self.__post(self.API_URL, json.dumps(d))
            log("trade result: " + str(result))
            return result
        else:
            log('trade type is not valid')
            return
    def get_orders(self):
        d = {}
        d['token'] = self.token
        d['op'] = 'get_orders'
        d['symbol'] = 'btc_cny'
        query = urllib.urlencode(d)
        result = self.__get('%s?%s' %(self.API_URL, query))
        log('get_order result: ' + str(result))
        return result
    def get_info(self):
        d = {}
        d['token'] = self.token
        d['op'] = 'get_info'
        query = urllib.urlencode(d)
        result = self.__get('%s?%s' %(self.API_URL, query))
        log('get_info result: ' + str(result))
        return result
    def cancel_order(self, order_id):
        d = {}
        d['token'] = self.token
        d['op'] = 'cancel_order'
        d['symbol'] = 'btc_cny'
        d['id'] = order_id
        result = self.__post(self.API_URL, json.dumps(d))
        log('cancel_order result: ' + str(result))
        return result
    def talent_total(self):
        info = self.get_info()
        funds = info['info']['funds']
        ticker = self.query_ticker()
        rate = ticker['ticker']['last_rate']
        log('CURRENT RATE: %lf' %rate)
        total = float(funds['locked']['cny']) + float(funds['free']['cny']) + (float(funds['free']['btc']) + float(funds['locked']['btc'])) * rate
        return total
    def talent_willing(self, willing_total):
        info = self.get_info()
        funds = info['info']['funds']
        rate = (willing_total - (float(funds['free']['cny']) + float(funds['locked']['cny']))) / (float(funds['free']['btc']) + float(funds['locked']['btc']))
        return rate
def test_web():
    client = FXWebClient(username, password)
    assert client.login()
    print client.buy(1888, 0.0001)
    print client.sell(88888, 0.0001)
def test_api():
    client = FXAPIClient(username, password)
    assert client.login()
    #print client.buy(3000, 0.02)

    result = client.get_orders()
    assert result['result'] is True

    result = client.get_info()
    assert result['result'] is True

    result = client.talent_total()
    assert isinstance(result, float)
    print "total cny: %lf" %result

    result = client.talent_willing(100.0)
    assert isinstance(result, float)
    print "willing rate: %lf" %result
def test_twisted():
    client1 = FXWebClient(username, password)
    client2 = FXAPIClient(username, password)
    assert client1.login() is True
    result = client1.buy(1888, 0.0001)
    assert result['result'] is True
    order_id = result['pending'][0]['id']
    assert client2.login() is True
    result = client2.cancel_order(order_id)
    assert result['result'] is True
if __name__ == '__main__':
    #test_web()
    #test_twisted()
    test_api()
Status API Training Shop Blog About © 2014 GitHub, Inc. Terms Privacy Security Contact 