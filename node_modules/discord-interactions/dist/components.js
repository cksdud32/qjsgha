"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeparatorSpacingTypes = exports.TextStyleTypes = exports.ChannelTypes = exports.ButtonStyleTypes = exports.MessageComponentTypes = void 0;
/**
 * The type of component
 * @see {@link https://discord.com/developers/docs/components/reference#what-is-a-component}
 */
var MessageComponentTypes;
(function (MessageComponentTypes) {
    MessageComponentTypes[MessageComponentTypes["ACTION_ROW"] = 1] = "ACTION_ROW";
    MessageComponentTypes[MessageComponentTypes["BUTTON"] = 2] = "BUTTON";
    MessageComponentTypes[MessageComponentTypes["STRING_SELECT"] = 3] = "STRING_SELECT";
    MessageComponentTypes[MessageComponentTypes["INPUT_TEXT"] = 4] = "INPUT_TEXT";
    MessageComponentTypes[MessageComponentTypes["USER_SELECT"] = 5] = "USER_SELECT";
    MessageComponentTypes[MessageComponentTypes["ROLE_SELECT"] = 6] = "ROLE_SELECT";
    MessageComponentTypes[MessageComponentTypes["MENTIONABLE_SELECT"] = 7] = "MENTIONABLE_SELECT";
    MessageComponentTypes[MessageComponentTypes["CHANNEL_SELECT"] = 8] = "CHANNEL_SELECT";
    MessageComponentTypes[MessageComponentTypes["SECTION"] = 9] = "SECTION";
    MessageComponentTypes[MessageComponentTypes["TEXT_DISPLAY"] = 10] = "TEXT_DISPLAY";
    MessageComponentTypes[MessageComponentTypes["THUMBNAIL"] = 11] = "THUMBNAIL";
    MessageComponentTypes[MessageComponentTypes["MEDIA_GALLERY"] = 12] = "MEDIA_GALLERY";
    MessageComponentTypes[MessageComponentTypes["FILE"] = 13] = "FILE";
    MessageComponentTypes[MessageComponentTypes["SEPARATOR"] = 14] = "SEPARATOR";
    MessageComponentTypes[MessageComponentTypes["CONTAINER"] = 17] = "CONTAINER";
    MessageComponentTypes[MessageComponentTypes["LABEL"] = 18] = "LABEL";
})(MessageComponentTypes || (exports.MessageComponentTypes = MessageComponentTypes = {}));
var ButtonStyleTypes;
(function (ButtonStyleTypes) {
    ButtonStyleTypes[ButtonStyleTypes["PRIMARY"] = 1] = "PRIMARY";
    ButtonStyleTypes[ButtonStyleTypes["SECONDARY"] = 2] = "SECONDARY";
    ButtonStyleTypes[ButtonStyleTypes["SUCCESS"] = 3] = "SUCCESS";
    ButtonStyleTypes[ButtonStyleTypes["DANGER"] = 4] = "DANGER";
    ButtonStyleTypes[ButtonStyleTypes["LINK"] = 5] = "LINK";
    ButtonStyleTypes[ButtonStyleTypes["PREMIUM"] = 6] = "PREMIUM";
})(ButtonStyleTypes || (exports.ButtonStyleTypes = ButtonStyleTypes = {}));
var ChannelTypes;
(function (ChannelTypes) {
    ChannelTypes[ChannelTypes["GUILD_TEXT"] = 0] = "GUILD_TEXT";
    ChannelTypes[ChannelTypes["DM"] = 1] = "DM";
    ChannelTypes[ChannelTypes["GUILD_VOICE"] = 2] = "GUILD_VOICE";
    ChannelTypes[ChannelTypes["GROUP_DM"] = 3] = "GROUP_DM";
    ChannelTypes[ChannelTypes["GUILD_CATEGORY"] = 4] = "GUILD_CATEGORY";
    ChannelTypes[ChannelTypes["GUILD_ANNOUNCEMENT"] = 5] = "GUILD_ANNOUNCEMENT";
    ChannelTypes[ChannelTypes["GUILD_STORE"] = 6] = "GUILD_STORE";
    ChannelTypes[ChannelTypes["ANNOUNCEMENT_THREAD"] = 10] = "ANNOUNCEMENT_THREAD";
    ChannelTypes[ChannelTypes["PUBLIC_THREAD"] = 11] = "PUBLIC_THREAD";
    ChannelTypes[ChannelTypes["PRIVATE_THREAD"] = 12] = "PRIVATE_THREAD";
    ChannelTypes[ChannelTypes["GUILD_STAGE_VOICE"] = 13] = "GUILD_STAGE_VOICE";
    ChannelTypes[ChannelTypes["GUILD_DIRECTORY"] = 14] = "GUILD_DIRECTORY";
    ChannelTypes[ChannelTypes["GUILD_FORUM"] = 15] = "GUILD_FORUM";
    ChannelTypes[ChannelTypes["GUILD_MEDIA"] = 16] = "GUILD_MEDIA";
})(ChannelTypes || (exports.ChannelTypes = ChannelTypes = {}));
var TextStyleTypes;
(function (TextStyleTypes) {
    TextStyleTypes[TextStyleTypes["SHORT"] = 1] = "SHORT";
    TextStyleTypes[TextStyleTypes["PARAGRAPH"] = 2] = "PARAGRAPH";
})(TextStyleTypes || (exports.TextStyleTypes = TextStyleTypes = {}));
var SeparatorSpacingTypes;
(function (SeparatorSpacingTypes) {
    SeparatorSpacingTypes[SeparatorSpacingTypes["SMALL"] = 1] = "SMALL";
    SeparatorSpacingTypes[SeparatorSpacingTypes["LARGE"] = 2] = "LARGE";
})(SeparatorSpacingTypes || (exports.SeparatorSpacingTypes = SeparatorSpacingTypes = {}));
//# sourceMappingURL=components.js.map