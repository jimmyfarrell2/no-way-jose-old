'use strict';

app.factory('GameSetup', function($q, $firebaseObject) {

    const gamesRef = new Firebase('https://dazzling-torch-382.firebaseio.com/games');
    const cardsRef = new Firebase('https://dazzling-torch-382.firebaseio.com/cards');
    const usersRef = new Firebase('https://dazzling-torch-382.firebaseio.com/users');
	const chatsRef = new Firebase('https://dazzling-torch-382.firebaseio.com/chats');

	var allGames = $firebaseObject(gamesRef);
	var allCards = $firebaseObject(cardsRef);
	var allUsers = $firebaseObject(usersRef);
	var allChats = $firebaseObject(chatsRef);

    var current = {};

    var gameIdGenerator = function() {
        return (Math.random() + 1).toString(36).slice(2, 7);
    };

	var prepareGame = function(gameForm, formType) {

		return doesGameExist(gameForm.gameId)
		.then(function(gameExists) {

			if (formType === 'join') {

				if (!gameExists) {
					throw 'Game ID does not exist.';
				}
				else {

					var playing = gameInProgress(gameForm.gameId);

					if (playing) throw 'Game is already in progress.';
					else {

						var loadPromises = [
							loadChat(gameForm.gameId),
							loadGame(gameForm.gameId)
						];

						return $q.all(loadPromises);

					}

				}
			}
			else {

				var createAndLoadPromises = [
					createAndLoadChat(gameForm.gameId),
					createAndLoadGame(gameForm.gameId)
				];

				return $q.all(createAndLoadPromises);

			}
		})
		.then(function() {

			if (!gameForm.username) throw 'Please enter a valid username.';
			return addUserToGame(gameForm);

		});
	};

    var doesGameExist = function(gameId) {

		return allGames.$loaded()
		.then(function() {

			return allGames[gameId];

		});

    };

	var gameInProgress = function(gameId) {
		return allGames[gameId].status === 'playing';
	};

	var loadChat = function(gameId) {

		return allChats.$loaded()
		.then(function() {
			current.chat = $firebaseObject(chatsRef.child(gameId));
			return current.chat.$loaded();
		});

	};

	var loadGame = function(gameId) {

		return allGames.$loaded()
		.then(function() {

			current.game = $firebaseObject(gamesRef.child(gameId));
			return current.game.$loaded();

		})
		.then(function() {

			return allCards.$loaded();

		})
		.then(function() {

			current.cards = $firebaseObject(cardsRef.child(gameId));
			return current.cards.$loaded();

		});

	};

	var createAndLoadChat = function(gameId) {

		var timestamp = Date.now();
		var firstMessage = {};

		firstMessage[timestamp] = {
			system: true,
			text: 'Welcome to the chat room. You can chat while waiting for your friends to join and while playing the game.',
			timestamp: Date.now()
		};

		allChats[gameId] = firstMessage;

		return allChats.$save()
		.then(function() {
			return loadChat(gameId);
		});

	};

    var createAndLoadGame = function(gameId) {

		var gamesAndCardsPromises = [];

        var newGame = {
			status: 'waiting',
			playerCount: 0,
			activePlayer: null,
			gameId,
			startTime: Firebase.ServerValue.TIMESTAMP
		};

		allGames[gameId] = newGame;
		allGames.$save()
		.then(function(gamesRef) {

			current.game = $firebaseObject(gamesRef.child(gameId));
			gamesAndCardsPromises.push(current.game.$loaded());

		});

        var newCards = { cardDeck: createCardDeck() };

		allCards[gameId] = newCards;
		allCards.$save()
		.then(function(cardsRef) {

			current.cards = $firebaseObject(cardsRef.child(gameId));
			gamesAndCardsPromises.push(current.cards.$loaded());

		});

		return $q.all(gamesAndCardsPromises)
		.then(function() {

			return loadGame(gameId);

		});

    };

    var createCardDeck = function() {

        var firstCard = 3,
			lastCard = 35,
			cardDeck = {};

        for (var i = firstCard; i <= lastCard; i++) {
            cardDeck[i] = {
				value: i,
				coins: 0
			};
        }

		var cardsArr = Object.keys(cardDeck);

		for (var j = 0; j < 9; j++) {
			let randIndex = Math.floor(Math.random() * cardsArr.length);
			let removeCard = cardsArr[randIndex];

			delete cardDeck[removeCard];
			cardsArr.splice(randIndex, 1);
		}

        return cardDeck;

    };

    var addUserToGame = function(gameForm) {

		return allUsers.$loaded()
		.then(function() {

			if (!allUsers[gameForm.gameId]) {
				allUsers[gameForm.gameId] = {};
				return allUsers.$save();
			}

		})
		.then(function() {

			current.users = $firebaseObject(usersRef.child(gameForm.gameId));
			return current.users.$loaded();

		})
		.then(function() {

			current.users[gameForm.username] = {
				username: gameForm.username,
				coins: 11,
				order: 0
			};

			return current.users.$save();

		})
		.then(function() {

			current.user = $firebaseObject(current.users.$ref().child(gameForm.username));
			return current.user.$loaded();

		});

    };

    return {
        gameIdGenerator,
		prepareGame,
		current
    };

});
