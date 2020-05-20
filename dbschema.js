// just an example schema

let db = {
    disregards: [
        {
            userHandle: 'username',
            body: 'disregard body / post',
            createdAt: '2020-05-14T11:46:01.018Z',
            likeCount: 5,
            commentCount: 2
        }
    ],
    comments: [
        {
          userHandle: 'user',
          disregardId: 'kdjsfgdksuufhgkdsufky',
          body: 'nice one mate!',
          createdAt: '2020-05-15T10:59:52.798Z'
        }
      ],
    users : [
        {
            userID: 'vrwgae789arg9ag9988a',
            email: 'user@user.com',
            handle: 'username',
            createdAt: '2020-05-14T11:46:01.018Z',
            imageUrl: 'image/fnirninakwddkw',
            bio: 'description about user...',
            website: 'user-personal-site@user.com',
            location: 'somewhere, UK'
        }
    ]
};