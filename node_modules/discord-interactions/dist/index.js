"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookEventMiddleware = exports.verifyKeyMiddleware = exports.verifyKey = exports.InteractionResponseFlags = exports.InteractionResponseType = exports.InteractionType = void 0;
const util_1 = require("./util");
const webhooks_1 = require("./webhooks");
/**
 * The type of interaction this request is.
 */
var InteractionType;
(function (InteractionType) {
    /**
     * A ping.
     */
    InteractionType[InteractionType["PING"] = 1] = "PING";
    /**
     * A command invocation.
     */
    InteractionType[InteractionType["APPLICATION_COMMAND"] = 2] = "APPLICATION_COMMAND";
    /**
     * Usage of a message's component.
     */
    InteractionType[InteractionType["MESSAGE_COMPONENT"] = 3] = "MESSAGE_COMPONENT";
    /**
     * An interaction sent when an application command option is filled out.
     */
    InteractionType[InteractionType["APPLICATION_COMMAND_AUTOCOMPLETE"] = 4] = "APPLICATION_COMMAND_AUTOCOMPLETE";
    /**
     * An interaction sent when a modal is submitted.
     */
    InteractionType[InteractionType["MODAL_SUBMIT"] = 5] = "MODAL_SUBMIT";
})(InteractionType || (exports.InteractionType = InteractionType = {}));
/**
 * The type of response that is being sent.
 */
var InteractionResponseType;
(function (InteractionResponseType) {
    /**
     * Acknowledge a `PING`.
     */
    InteractionResponseType[InteractionResponseType["PONG"] = 1] = "PONG";
    /**
     * Respond with a message, showing the user's input.
     */
    InteractionResponseType[InteractionResponseType["CHANNEL_MESSAGE_WITH_SOURCE"] = 4] = "CHANNEL_MESSAGE_WITH_SOURCE";
    /**
     * Acknowledge a command without sending a message, showing the user's input. Requires follow-up.
     */
    InteractionResponseType[InteractionResponseType["DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE"] = 5] = "DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE";
    /**
     * Acknowledge an interaction and edit the original message that contains the component later; the user does not see a loading state.
     */
    InteractionResponseType[InteractionResponseType["DEFERRED_UPDATE_MESSAGE"] = 6] = "DEFERRED_UPDATE_MESSAGE";
    /**
     * Edit the message the component was attached to.
     */
    InteractionResponseType[InteractionResponseType["UPDATE_MESSAGE"] = 7] = "UPDATE_MESSAGE";
    /*
     * Callback for an app to define the results to the user.
     */
    InteractionResponseType[InteractionResponseType["APPLICATION_COMMAND_AUTOCOMPLETE_RESULT"] = 8] = "APPLICATION_COMMAND_AUTOCOMPLETE_RESULT";
    /*
     * Respond with a modal.
     */
    InteractionResponseType[InteractionResponseType["MODAL"] = 9] = "MODAL";
    /*
     * Respond with an upgrade prompt.
     */
    InteractionResponseType[InteractionResponseType["PREMIUM_REQUIRED"] = 10] = "PREMIUM_REQUIRED";
    /**
     * Launch an Activity.
     */
    InteractionResponseType[InteractionResponseType["LAUNCH_ACTIVITY"] = 12] = "LAUNCH_ACTIVITY";
})(InteractionResponseType || (exports.InteractionResponseType = InteractionResponseType = {}));
/**
 * Flags that can be included in an Interaction Response.
 */
var InteractionResponseFlags;
(function (InteractionResponseFlags) {
    /**
     * Show the message only to the user that performed the interaction. Message
     * does not persist between sessions.
     */
    InteractionResponseFlags[InteractionResponseFlags["EPHEMERAL"] = 64] = "EPHEMERAL";
    /**
     * Allows you to create fully component-driven messages
     * @see {@link https://discord.com/developers/docs/components/reference}
     */
    InteractionResponseFlags[InteractionResponseFlags["IS_COMPONENTS_V2"] = 32768] = "IS_COMPONENTS_V2";
})(InteractionResponseFlags || (exports.InteractionResponseFlags = InteractionResponseFlags = {}));
/**
 * Validates a payload from Discord against its signature and key.
 *
 * @param rawBody - The raw payload data
 * @param signature - The signature from the `X-Signature-Ed25519` header
 * @param timestamp - The timestamp from the `X-Signature-Timestamp` header
 * @param clientPublicKey - The public key from the Discord developer dashboard
 * @returns Whether or not validation was successful
 */
function verifyKey(rawBody, signature, timestamp, clientPublicKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const timestampData = (0, util_1.valueToUint8Array)(timestamp);
            const bodyData = (0, util_1.valueToUint8Array)(rawBody);
            const message = (0, util_1.concatUint8Arrays)(timestampData, bodyData);
            const publicKey = typeof clientPublicKey === 'string'
                ? yield util_1.subtleCrypto.importKey('raw', (0, util_1.valueToUint8Array)(clientPublicKey, 'hex'), {
                    name: 'ed25519',
                    namedCurve: 'ed25519',
                }, false, ['verify'])
                : clientPublicKey;
            const isValid = yield util_1.subtleCrypto.verify({
                name: 'ed25519',
            }, publicKey, (0, util_1.valueToUint8Array)(signature, 'hex'), message);
            return isValid;
        }
        catch (_ex) {
            return false;
        }
    });
}
exports.verifyKey = verifyKey;
/**
 * Creates a middleware function for use in Express-compatible web servers for verifying Interaction Webhooks.
 *
 * @param clientPublicKey - The public key from the Discord developer dashboard
 * @returns The middleware function
 */
function verifyKeyMiddleware(clientPublicKey) {
    if (!clientPublicKey) {
        throw new Error('You must specify a Discord client public key');
    }
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const timestamp = req.header('X-Signature-Timestamp') || '';
        const signature = req.header('X-Signature-Ed25519') || '';
        if (!timestamp || !signature) {
            res.statusCode = 401;
            res.end('[discord-interactions] Invalid signature');
            return;
        }
        function onBodyComplete(rawBody) {
            return __awaiter(this, void 0, void 0, function* () {
                const isValid = yield verifyKey(rawBody, signature, timestamp, clientPublicKey);
                if (!isValid) {
                    res.statusCode = 401;
                    res.end('[discord-interactions] Invalid signature');
                    return;
                }
                const body = JSON.parse(rawBody.toString('utf-8')) || {};
                if (body.type === InteractionType.PING) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        type: InteractionResponseType.PONG,
                    }));
                    return;
                }
                req.body = body;
                next();
            });
        }
        if (req.body) {
            if (Buffer.isBuffer(req.body)) {
                yield onBodyComplete(req.body);
            }
            else if (typeof req.body === 'string') {
                yield onBodyComplete(Buffer.from(req.body, 'utf-8'));
            }
            else {
                console.warn('[discord-interactions]: req.body was tampered with, probably by some other middleware. We recommend disabling middleware for interaction routes so that req.body is a raw buffer.');
                // Attempt to reconstruct the raw buffer. This works but is risky
                // because it depends on JSON.stringify matching the Discord backend's
                // JSON serialization.
                yield onBodyComplete(Buffer.from(JSON.stringify(req.body), 'utf-8'));
            }
        }
        else {
            const chunks = [];
            req.on('data', (chunk) => {
                chunks.push(chunk);
            });
            req.on('end', () => __awaiter(this, void 0, void 0, function* () {
                const rawBody = Buffer.concat(chunks);
                yield onBodyComplete(rawBody);
            }));
        }
    });
}
exports.verifyKeyMiddleware = verifyKeyMiddleware;
/**
 * Creates a middleware function for use in Express-compatible web servers for verifying Event Webhooks.
 *
 * @param clientPublicKey - The public key from the Discord developer dashboard
 * @returns The middleware function
 */
function verifyWebhookEventMiddleware(clientPublicKey) {
    if (!clientPublicKey) {
        throw new Error('You must specify a Discord client public key');
    }
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const timestamp = req.header('X-Signature-Timestamp') || '';
        const signature = req.header('X-Signature-Ed25519') || '';
        if (!timestamp || !signature) {
            res.statusCode = 401;
            res.end('[discord-interactions] Invalid signature');
            return;
        }
        function onBodyComplete(rawBody) {
            return __awaiter(this, void 0, void 0, function* () {
                const isValid = yield verifyKey(rawBody, signature, timestamp, clientPublicKey);
                if (!isValid) {
                    res.statusCode = 401;
                    res.end('[discord-interactions] Invalid signature');
                    return;
                }
                const body = JSON.parse(rawBody.toString('utf-8')) || {};
                if (body.type === webhooks_1.WebhookType.PING) {
                    res.statusCode = 204;
                    res.end();
                    return;
                }
                req.body = body;
                // return 204 status, and an empty body
                res.statusCode = 204;
                res.end();
                // process the body data
                next();
            });
        }
        if (req.body) {
            if (Buffer.isBuffer(req.body)) {
                yield onBodyComplete(req.body);
            }
            else if (typeof req.body === 'string') {
                yield onBodyComplete(Buffer.from(req.body, 'utf-8'));
            }
            else {
                console.warn('[discord-interactions]: req.body was tampered with, probably by some other middleware. We recommend disabling middleware for webhook event routes so that req.body is a raw buffer.');
                // Attempt to reconstruct the raw buffer. This works but is risky
                // because it depends on JSON.stringify matching the Discord backend's
                // JSON serialization.
                yield onBodyComplete(Buffer.from(JSON.stringify(req.body), 'utf-8'));
            }
        }
        else {
            const chunks = [];
            req.on('data', (chunk) => {
                chunks.push(chunk);
            });
            req.on('end', () => __awaiter(this, void 0, void 0, function* () {
                const rawBody = Buffer.concat(chunks);
                yield onBodyComplete(rawBody);
            }));
        }
    });
}
exports.verifyWebhookEventMiddleware = verifyWebhookEventMiddleware;
__exportStar(require("./components"), exports);
__exportStar(require("./webhooks"), exports);
//# sourceMappingURL=index.js.map