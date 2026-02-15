import React from 'react';
import Avatar from 'react-avatar';

const ClientAvatar = ({ username }) => {
    return (
        <div className="client flex flex-col items-center gap-1">
            <Avatar name={username} size={50} round="14px" />
            <span className="userName text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap max-w-[60px]">{username}</span>
        </div>
    );
};

// 👇 THIS LINE IS MISSING IN YOUR FILE 👇
export default ClientAvatar;