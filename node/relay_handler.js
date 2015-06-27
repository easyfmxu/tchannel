// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var RelayRequest = require('./relay_request');

function RelayHandler(channel) {
    var self = this;
    self.channel = channel;
    self.reqs = {};
}

RelayHandler.prototype.type = 'tchannel.relay-handler';

RelayHandler.prototype.handleRequest = function handleRequest(req, buildRes) {
    var self = this;

    var reqKey = getReqKey(req);
    var rereq = self.reqs[reqKey];

    if (rereq) {
        self.channel.logger.error('relay request already exists for incoming request', {
            inReqId: req.id,
            priorInResId: rereq.inres && rereq.inres.id,
            priorOutResId: rereq.outres && rereq.outres.id,
            priorOutReqId: rereq.outreq && rereq.outreq.id
            // TODO more context, like outreq remote addr
        });
        buildRes().sendError(
            'UnexpectedError', 'request id exists in relay handler'
        );
        return;
    }

    rereq = new RelayRequest(self.channel, req, buildRes);

    self.reqs[reqKey] = rereq;
    rereq.finishEvent.on(rereqFinished);
    rereq.createOutRequest();

    function rereqFinished() {
        self.clearRequest(reqKey);
    }
};

RelayHandler.prototype.clearRequest = function clearRequest(reqKey) {
    var self = this;

    delete self.reqs[reqKey];
};

function getReqKey(req) {
    return req.connection.guid + '~' + req.id;
}

module.exports = RelayHandler;
