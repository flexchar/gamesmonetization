(function(){
	'use strict';
	angular.module('LuVa-app', ['ngMaterial','md.data.table'])
		.config(function($mdThemingProvider) {
			$mdThemingProvider.theme('default')
				.primaryPalette('green')
				.accentPalette('blue')
				.warnPalette('deep-orange');

			 $mdThemingProvider.enableBrowserColor();
		})
		.service('sw', function($mdToast) {
			var self = this;

			self.exec = function(state) {

				if (!'serviceWorker' in navigator || !state) return;

				navigator.serviceWorker.register('/sw.js').then(function(reg) {

					if (reg.installing) {
						reg.installing.addEventListener('statechange', function(){
							if (reg.active) {
								$mdToast.show(
									$mdToast.simple()
										.textContent('App Cached! Ready for offline use.')
										.hideDelay(5000)
								);  
							}
						});		
					}	

					if (!navigator.serviceWorker.controller) return;

					if (reg.installing) {
						self.trackInstall(reg.installing);
						return;
					}	

					if (reg.waiting) {
						self.notify(reg.waiting);
						return;
					}

					reg.addEventListener('updatefound', function() {
						self.notify(reg.installing);
					});


				});
								
			}

			self.trackInstall = function(sw) {
				sw.addEventListener('statechange', function() {
					if (sw.state == "waiting") {
						self.notify(sw);
					}
				});
			}

			self.notify = function(sw) {
				$mdToast.show(
					$mdToast.simple()
						.textContent("Update available")
						.highlightAction(true)
						.action("Update")
						.hideDelay(5000)
				).then(function(res) {
					if (res == 'ok') {
						sw.postMessage('skipWaiting');
						self.activation();
					} else {
						return;
					}
				});
			}

			self.activation = function() {
				var refreshing;
				navigator.serviceWorker.addEventListener('controllerchange', function(){
					if (refreshing) return;
					window.location.reload();
					refreshing = true;
				});
			}
		})	
		.controller('Ctrl', function($http, $timeout, $q, $mdDialog, $mdToast, sw) {
			var self = this;
			
			window.addEventListener('load', function(){sw.exec(true);});			

			self.database = [];
			self.fabState = false;
			self.tooltipToggle = false;

			self.fabToggle = function(s=null) {
				if (s==null) {
					s = self.fabState;
				}
				if (s) {
					self.fabState = true;
					$timeout(function(){
						self.tooltipToggle = true;
					}, 400);
				} else {					
					self.tooltipToggle = false;
					self.fabState = false;
				}
			}

			var email="lukas@youtuberis.lt";
			var spreadsheetId = "17PfvQsVjMTcZrenYKE_7uy20V1YIEkDoyVokaN0Ni_w";

			self.fetchData = function(update = null) {

				var cleanData = function(data){

					self.database = [];

					var parse = function(entry) {
						var publisher = entry['gsx$publisher']['$t'];
						var game = entry['gsx$game']['$t'];
						var monetization = entry['gsx$monetization']['$t'];
						var info = entry['gsx$information']['$t'];
						var source = entry['gsx$source']['$t'];
						var timestamp = entry['gsx$timestamp']['$t'];
						return {
							publisher: publisher,
							game: game,
							monetization: monetization,
							info: info,
							source: source,
							timestamp: timestamp
						};
					}

					angular.forEach(data, function(value) {
			    		self.database.push(parse(value));
					});

			    	//console.log("Done cleaning data!");
			    	deferred.resolve();
				};

				var deferred = $q.defer();
				self.loading = deferred.promise;

				var networkFetch = function() {
					$http.get('https://spreadsheets.google.com/feeds/list/'+ spreadsheetId +'/1/public/values?alt=json').then(
						function(res){
							//console.log("Done fetching data! (" + (res.data.feed['entry']).length + ")");
							cleanData(res.data.feed['entry']);

						}, function(res){
							//console.log('Failed to load DB! '+ res.status);
							$timeout(function(){
				    			deferred.resolve(); 
							}, 500);
					});
				}

				if (update == true) {
					if (navigator.onLine) {
						networkFetch();
					} else {
						$mdToast.showSimple("Cannot update without internet connection.");
						deferred.resolve();
					}
				} else {
					caches.match('database').then(function(res){

						if (!res) return networkFetch();
						return res.json();

					}).then(function(data) {

						if (data) cleanData(data.feed['entry']);

					}, function(res){
						return networkFetch();
					});
				}
			}
			self.fetchData();

			var sendMail = function(data){
				$http.post('https://formspree.io/'+email, data).then(function(res) {
					if (res.data.success == "email sent") {
						$mdToast.show(
							$mdToast.simple()
							.textContent('Successfully Sent!')
							.position("bottom left")
							.hideDelay(4500)
						);
					}

				}, function(res) {
					console.log("Error: "+res.statusText+' | Service: '+res.data.error +' | Code:'+ res.status);
					$mdToast.showSimple("Failed to send.");
				});
			};

			self.showFeedback = function(ev) {
				$mdDialog.show({
					controller: feedbackCtrl,
					controllerAs: 'app',
					templateUrl: '/asset/form.html',
					//parent: angular.element(document.body),
					//targetEvent: ev,
					clickOutsideToClose: false,
					fullscreen: true
				}).then(function(form) {
					var mailData = {
						'name' 	  : form.name,
						'_replyto': form.email,
						'_subject': form.type=='t2'?'Request':'Feedback & Contact' + ' | YouTube Resources Games DB',
						'message' : form.body 
					};
					if (!form.sec) {
						sendMail(mailData);
					}
				}, function() {
					//console.log('Dialog Closed.');
				});
			};

			function feedbackCtrl($mdDialog) {
				var self = this;


				self.offline = !navigator.onLine;

				window.addEventListener('online', function(){
					self.offline = false;
					$mdToast.showSimple("Connected!");
				});
				window.addEventListener('offline', function(){
					self.offline = true;
					$mdToast.showSimple("You went offline!");
				});

			    self.hide = function() {
			      $mdDialog.hide();
			    };

			    self.cancel = function() {
			      $mdDialog.cancel();
			    };

			    self.answer = function(answer) {
			      $mdDialog.hide(answer);
			    };
		  	}

		  	self.dataUsage = function() {
				navigator.webkitTemporaryStorage.queryUsageAndQuota(function(i,o){
					console.log("Disk space "+Math.round(i/1024/1024)+ "MB used out of " + Math.round(o/1024/1024/1024,2) +"GB");
					$mdToast.showSimple("Disk space "+Math.round(i/1024/1024)+ "MB used out of " + Math.round(o/1024/1024/1024,2) +"GB");
				});		  		
		  	}
		});
}());
