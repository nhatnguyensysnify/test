(function () {
	'use strict';
	angular.module('app.utils').factory('applicationMaps', [function () {
		var fieldsMap = {};
		/* jshint ignore:start */
		fieldsMap['credit_card_number'] = 'applicationVm.model.creditCard.creditCardNumber';
		fieldsMap['cvv'] = 'applicationVm.model.creditCard.cvv';
		fieldsMap['expiration_date'] = 'applicationVm.memberModel.creditCard.expiration_date';
		fieldsMap['card_number'] = 'applicationVm.memberModel.priMember.memberId';
		fieldsMap['firstname'] = 'applicationVm.memberModel.priMember.firstName';
		fieldsMap['lastname'] = 'applicationVm.memberModel.priMember.lastName';
		fieldsMap['email'] = 'applicationVm.memberModel.priMember.email';
		fieldsMap['phone'] = 'applicationVm.memberModel.priMember.phone';
		fieldsMap['mailing_address'] = 'applicationVm.memberModel.priMember.mailingAddress.address';
		fieldsMap['sec_card_number'] = 'applicationVm.memberModel.secMember.memberId';
		fieldsMap['sec_firstname'] = 'applicationVm.memberModel.secMember.firstName';
		fieldsMap['sec_lastname'] = 'applicationVm.memberModel.secMember.lastName';
		fieldsMap['sec_email'] = 'applicationVm.memberModel.secMember.email';
		fieldsMap['sec_phone'] = 'applicationVm.memberModel.secMember.phone';
		fieldsMap['app_source_class'] = 'applicationVm.model.sourceClass';
		fieldsMap['app_source_gun_show'] = 'applicationVm.model.sourceGunShow';
		fieldsMap['app_source_other'] = 'applicationVm.model.sourceOther';
		fieldsMap['app_source_seminar'] = 'applicationVm.model.sourceSeminar';
		fieldsMap['swiper_yes'] = 'applicationVm.model.processOnSwiper';
		fieldsMap['pri_total'] = 'applicationVm.model.total.priMemTotalAmount';
		fieldsMap['sec_total'] = 'applicationVm.model.total.secMemTotalAmount';
		fieldsMap['total'] = 'applicationVm.model.total.totalAmount';
		fieldsMap['app_process_on_swiper_yes'] = 'applicationVm.model.processOnSwiper';
		fieldsMap['app_process_on_swiper_no'] = 'applicationVm.model.processOnSwiper';
		fieldsMap['representative_code'] = 'applicationVm.model.representativeCode';
		fieldsMap['facility_code'] = 'applicationVm.model.facilityCode';
		fieldsMap['signature'] = 'applicationVm.model.signature';
		fieldsMap['date'] = 'applicationVm.model.signatureDate';
		/* jshint ignore:end */
		var frmMap = {
			AR: 'FORM_1',
			CO: 'FORM_1',
			FL: 'FORM_1',
			GA: 'FORM_1',
			KS: 'FORM_1',
			NJ: 'FORM_1',
			OK: 'FORM_2',
			TX: 'FORM_2',
			IN: 'FORM_3',
			MS: 'FORM_3',
			NM: 'FORM_3',
			NV: 'FORM_3'
		};
		var diviationX = 0;
		var diviationY = 0;
		var maps = {};

		function getFrmSettings(stateCode) {
			if (frmMap[stateCode]) {
				return maps[frmMap[stateCode]];
			} else {
				console.log('Doesn\'t exists this state in config.');
			}
		}
		/* jshint ignore:start */
		maps['FORM_1'] = {};
		maps['FORM_1']['markers'] = {};
		maps['FORM_1']['markers']['credit_card_number'] = { pos: { top: 226 + diviationY, left: 28 + diviationX }, size: { width: 632, height: 49 }, map: 'creditCardNum' };
		maps['FORM_1']['markers']['expiration_date'] = { pos: { top: 226 + diviationY, left: 684 + diviationX }, size: { width: 207, height: 49 }, map: 'expDate' };
		maps['FORM_1']['markers']['cvv'] = { pos: { top: 226 + diviationY, left: 916 + diviationX }, size: { width: 175, height: 49 }, map: 'cvv' };
		maps['FORM_1']['markers']['card_number'] = { pos: { top: 338 + diviationY, left: 80 + diviationX }, size: { width: 306, height: 49 }, map: 'memberId' };
		maps['FORM_1']['markers']['card_number_monthly'] = { pos: { top: 424 + diviationY, left: 40 + diviationX }, size: { width: 330, height: 49 }, map: 'corePlanMonthly' };
		maps['FORM_1']['markers']['card_number_annual'] = { pos: { top: 476 + diviationY, left: 40 + diviationX }, size: { width: 330, height: 49 }, map: 'corePlanAnnual' };
		maps['FORM_1']['markers']['fifty_protect'] = { pos: { top: 317 + diviationY, left: 756 + diviationX }, size: { width: 36, height: 36 }, map: 'addFiftyStateProtection' };
		maps['FORM_1']['markers']['minor_children'] = { pos: { top: 317 + diviationY, left: 1155 + diviationX }, size: { width: 36, height: 36 }, map: 'addMinorChildren' };
		maps['FORM_1']['markers']['firstname'] = { pos: { top: 554 + diviationY, left: 28 + diviationX }, size: { width: 440, height: 49 }, map: 'firstname' };
		maps['FORM_1']['markers']['lastname'] = { pos: { top: 554 + diviationY, left: 492 + diviationX }, size: { width: 670, height: 49 }, map: 'lastname' };
		maps['FORM_1']['markers']['email'] = { pos: { top: 610 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'email' };
		maps['FORM_1']['markers']['phone'] = { pos: { top: 776 + diviationY, left: 376 + diviationX }, size: { width: 439, height: 49 }, map: 'phone' };
		maps['FORM_1']['markers']['mailing_address'] = { pos: { top: 665 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'mailingAddress' };
		maps['FORM_1']['markers']['city'] = { pos: { top: 722 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'city' };
		maps['FORM_1']['markers']['state'] = { pos: { top: 776 + diviationY, left: 28 + diviationX }, size: { width: 96, height: 49 }, map: 'state' };
		maps['FORM_1']['markers']['zipcode'] = { pos: { top: 776 + diviationY, left: 146 + diviationX }, size: { width: 210, height: 49 }, map: 'zip' };
		maps['FORM_1']['markers']['sec_card_number'] = { pos: { top: 889 + diviationY, left: 80 + diviationX }, size: { width: 310, height: 49 }, map: 'secMemberId' };
		maps['FORM_1']['markers']['sec_monthly'] = { pos: { top: 974 + diviationY, left: 40 + diviationX }, size: { width: 330, height: 49 }, map: 'secCorePlan' };
		maps['FORM_1']['markers']['sec_annual'] = { pos: { top: 1025 + diviationY, left: 40 + diviationX }, size: { width: 330, height: 49 }, map: 'secCorePlan' };
		maps['FORM_1']['markers']['sec_50_protection'] = { pos: { top: 865 + diviationY, left: 1150 + diviationX }, size: { width: 36, height: 36 }, map: 'secAddFiftyStateProtection' };
		maps['FORM_1']['markers']['sec_firstname'] = { pos: { top: 1105 + diviationY, left: 28 + diviationX }, size: { width: 438, height: 49 }, map: 'secFirstName' };
		maps['FORM_1']['markers']['sec_lastname'] = { pos: { top: 1105 + diviationY, left: 492 + diviationX }, size: { width: 668, height: 49 }, map: 'secLastName' };
		maps['FORM_1']['markers']['sec_email'] = { pos: { top: 1162 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'secEmail' };
		maps['FORM_1']['markers']['sec_phone'] = { pos: { top: 1220 + diviationY, left: 28 + diviationX }, size: { width: 440, height: 49 }, map: 'secPhone' };
		maps['FORM_1']['markers']['pri_total'] = { pos: { top: -1304 + diviationY, left: 259 + diviationX }, size: { width: 177, height: 49 }, map: 'priMemTotal' };
		maps['FORM_1']['markers']['sec_total'] = { pos: { top: -1304 + diviationY, left: 565 + diviationX }, size: { width: 152, height: 49 }, map: 'secMemTotal' };
		maps['FORM_1']['markers']['startup'] = { pos: { top: 1304 + diviationY, left: 730 + diviationX }, size: { width: 168, height: 49 }, map: 'startup' };
		maps['FORM_1']['markers']['total'] = { pos: { top: 1304 + diviationY, left: 982 + diviationX }, size: { width: 208, height: 49 }, map: 'totalAmount' };
		maps['FORM_1']['markers']['signature'] = { pos: { top: 1425 + diviationY, left: 153 + diviationX }, size: { width: 512, height: 49 }, map: 'signature' };
		maps['FORM_1']['markers']['date'] = { pos: { top: 1425 + diviationY, left: 734 + diviationX }, size: { width: 402, height: 49 }, map: 'dateSignature' };
		maps['FORM_1']['markers']['representative_code'] = { pos: { top: 1518 + diviationY, left: 16 + diviationX }, size: { width: 274, height: 65 }, map: 'representation' };
		maps['FORM_1']['markers']['app_source_class'] = { pos: { top: 1518 + diviationY, left: 314 + diviationX }, size: { width: 274, height: 65 }, map: 'appSource' };
		maps['FORM_1']['markers']['swiper_no'] = { pos: { top: 1518 + diviationY, left: 612 + diviationX }, size: { width: 274, height: 65 }, map: 'appProcessSwiper' };
		maps['FORM_1']['markers']['swiper_yes'] = { pos: { top: 1518 + diviationY, left: 612 + diviationX }, size: { width: 274, height: 65 }, map: 'appProcessSwiper' };
		maps['FORM_1']['markers']['facility_code'] = { pos: { top: 1518 + diviationY, left: 908 + diviationX }, size: { width: 274, height: 65 }, map: 'facilityCode' };

		maps['FORM_1']['mapping'] = {
			creditCardNum: { selected: false, required: false, valid: true, frmScrollTop: 0, picScrollTop: 320 },
			expDate: { selected: false, required: false, valid: true, frmScrollTop: 40, picScrollTop: 320 },
			cvv: { selected: false, required: false, valid: true, frmScrollTop: 85, picScrollTop: 320 },
			memberId: { selected: false, required: false, valid: true, frmScrollTop: 260, picScrollTop: 420 },
			corePlanMonthly: { selected: false, required: false, valid: true, frmScrollTop: 330, picScrollTop: 520 },
			corePlanAnnual: { selected: false, required: false, valid: true, frmScrollTop: 330, picScrollTop: 580 },
			addFiftyStateProtection: { selected: false, required: false, valid: true, frmScrollTop: 400, picScrollTop: 420 },
			addMinorChildren: { selected: false, required: false, valid: true, frmScrollTop: 470, picScrollTop: 420 },
			firstname: { selected: false, required: false, valid: true, frmScrollTop: 540, picScrollTop: 630 },
			lastname: { selected: false, required: false, valid: true, frmScrollTop: 580, picScrollTop: 630 },
			email: { selected: false, required: false, valid: true, frmScrollTop: 645, picScrollTop: 655 },
			phone: { selected: false, required: false, valid: true, frmScrollTop: 710, picScrollTop: 655 },
			mailingAddress: { selected: false, required: false, valid: true, frmScrollTop: 760, picScrollTop: 700 },
			city: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },
			state: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },
			zip: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },// ???
			secMemberId: { selected: false, required: false, valid: true, frmScrollTop: 930, picScrollTop: 900 },
			secCorePlan: { selected: false, required: false, valid: true, frmScrollTop: 1030, picScrollTop: 1100 },
			secAddFiftyStateProtection: { selected: false, required: false, valid: true, frmScrollTop: 1110, picScrollTop: 870 },
			secFirstName: { selected: false, required: false, valid: true, frmScrollTop: 1290, picScrollTop: 1100 },
			secLastName: { selected: false, required: false, valid: true, frmScrollTop: 1330, picScrollTop: 1100 },
			secEmail: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			secPhone: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			priMemTotal: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			secMemTotal: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			startup: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			totalAmount: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			signature: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			dateSignature: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			representation: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			appSource: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			appProcessSwiper: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			facilityCode: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 }
		};



		// 
		maps['FORM_2'] = {};
		maps['FORM_2']['markers'] = {};
		maps['FORM_2']['markers']['credit_card_number'] = { pos: { top: 226 + diviationY, left: 28 + diviationX }, size: { width: 632, height: 49 }, map: 'creditCardNum' };
		maps['FORM_2']['markers']['expiration_date'] = { pos: { top: 226 + diviationY, left: 684 + diviationX }, size: { width: 207, height: 49 }, map: 'expDate' };
		maps['FORM_2']['markers']['cvv'] = { pos: { top: 226 + diviationY, left: 916 + diviationX }, size: { width: 175, height: 49 }, map: 'cvv' };
		maps['FORM_2']['markers']['card_number'] = { pos: { top: 350 + diviationY, left: 26 + diviationX }, size: { width: 270, height: 49 }, map: 'memberId' };
		maps['FORM_2']['markers']['card_number_monthly'] = { pos: { top: 424 + diviationY, left: 26 + diviationX }, size: { width: 270, height: 49 }, map: 'corePlanMonthly' };
		maps['FORM_2']['markers']['card_number_annual'] = { pos: { top: 476 + diviationY, left: 26 + diviationX }, size: { width: 270, height: 49 }, map: 'corePlanAnnual' };
		maps['FORM_2']['markers']['fifty_protect'] = { pos: { top: 320 + diviationY, left: 558 + diviationX }, size: { width: 36, height: 36 }, map: 'addFiftyStateProtection' };
		maps['FORM_2']['markers']['bailbond'] = { id: 'add-bail-bond', pos: { top: 320 + diviationY, left: 853 + diviationX }, size: { width: 36, height: 36 }, map: 'addBailBond' };
		maps['FORM_2']['markers']['minor_children'] = { pos: { top: 320 + diviationY, left: 1150 + diviationX }, size: { width: 36, height: 36 }, map: 'addMinorChildren' };
		maps['FORM_2']['markers']['firstname'] = { pos: { top: 554 + diviationY, left: 28 + diviationX }, size: { width: 440, height: 49 }, map: 'firstname' };
		maps['FORM_2']['markers']['lastname'] = { pos: { top: 554 + diviationY, left: 492 + diviationX }, size: { width: 670, height: 49 }, map: 'lastname' };
		maps['FORM_2']['markers']['email'] = { pos: { top: 610 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'email' };
		maps['FORM_2']['markers']['phone'] = { pos: { top: 776 + diviationY, left: 376 + diviationX }, size: { width: 439, height: 49 }, map: 'phone' };
		maps['FORM_2']['markers']['mailing_address'] = { pos: { top: 665 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'mailingAddress' };
		maps['FORM_2']['markers']['city'] = { pos: { top: 722 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'city' };
		maps['FORM_2']['markers']['state'] = { pos: { top: 776 + diviationY, left: 28 + diviationX }, size: { width: 96, height: 49 }, map: 'state' };
		maps['FORM_2']['markers']['zipcode'] = { pos: { top: 776 + diviationY, left: 146 + diviationX }, size: { width: 210, height: 49 }, map: 'zip' };
		maps['FORM_2']['markers']['sec_card_number'] = { pos: { top: 889 + diviationY, left: 80 + diviationX }, size: { width: 310, height: 49 }, map: 'secMemberId' };
		maps['FORM_2']['markers']['sec_monthly'] = { pos: { top: 974 + diviationY, left: 40 + diviationX }, size: { width: 330, height: 49 }, map: 'secCorePlan' };
		maps['FORM_2']['markers']['sec_annual'] = { pos: { top: 1025 + diviationY, left: 40 + diviationX }, size: { width: 330, height: 49 }, map: 'secCorePlan' };
		maps['FORM_2']['markers']['sec_50_protection'] = { pos: { top: 866 + diviationY, left: 752 + diviationX }, size: { width: 36, height: 36 }, map: 'secAddFiftyStateProtection' };
		maps['FORM_2']['markers']['sec_bailbond'] = { pos: { top: 866 + diviationY, left: 1150 + diviationX }, size: { width: 36, height: 36 }, map: 'secAddBailBond' };
		maps['FORM_2']['markers']['sec_firstname'] = { pos: { top: 1105 + diviationY, left: 28 + diviationX }, size: { width: 438, height: 49 }, map: 'secFirstName' };
		maps['FORM_2']['markers']['sec_lastname'] = { pos: { top: 1105 + diviationY, left: 492 + diviationX }, size: { width: 668, height: 49 }, map: 'secLastName' };
		maps['FORM_2']['markers']['sec_email'] = { pos: { top: 1162 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'secEmail' };
		maps['FORM_2']['markers']['sec_phone'] = { pos: { top: 1220 + diviationY, left: 28 + diviationX }, size: { width: 440, height: 49 }, map: 'secPhone' };
		maps['FORM_2']['markers']['pri_total'] = { pos: { top: -1304 + diviationY, left: 259 + diviationX }, size: { width: 177, height: 49 }, map: 'priMemTotal' };
		maps['FORM_2']['markers']['sec_total'] = { pos: { top: -1304 + diviationY, left: 565 + diviationX }, size: { width: 152, height: 49 }, map: 'secMemTotal' };
		maps['FORM_2']['markers']['startup'] = { pos: { top: 1304 + diviationY, left: 730 + diviationX }, size: { width: 168, height: 49 }, map: 'startup' };
		maps['FORM_2']['markers']['total'] = { pos: { top: 1304 + diviationY, left: 982 + diviationX }, size: { width: 208, height: 49 }, map: 'totalAmount' };
		maps['FORM_2']['markers']['signature'] = { pos: { top: 1425 + diviationY, left: 153 + diviationX }, size: { width: 512, height: 49 }, map: 'signature' };
		maps['FORM_2']['markers']['date'] = { pos: { top: 1425 + diviationY, left: 734 + diviationX }, size: { width: 402, height: 49 }, map: 'dateSignature' };
		maps['FORM_2']['markers']['representative_code'] = { pos: { top: 1518 + diviationY, left: 16 + diviationX }, size: { width: 274, height: 65 }, map: 'representation' };
		maps['FORM_2']['markers']['app_source_class'] = { pos: { top: 1518 + diviationY, left: 314 + diviationX }, size: { width: 274, height: 65 }, map: 'appSource' };
		maps['FORM_2']['markers']['swiper_no'] = { pos: { top: 1518 + diviationY, left: 612 + diviationX }, size: { width: 274, height: 65 }, map: 'appProcessSwiper' };
		maps['FORM_2']['markers']['swiper_yes'] = { pos: { top: 1518 + diviationY, left: 612 + diviationX }, size: { width: 274, height: 65 }, map: 'appProcessSwiper' };
		maps['FORM_2']['markers']['facility_code'] = { pos: { top: 1518 + diviationY, left: 908 + diviationX }, size: { width: 274, height: 65 }, map: 'facilityCode' };

		maps['FORM_2']['mapping'] = {
			creditCardNum: { selected: false, required: false, valid: true, frmScrollTop: 0, picScrollTop: 320 },
			expDate: { selected: false, required: false, valid: true, frmScrollTop: 40, picScrollTop: 320 },
			cvv: { selected: false, required: false, valid: true, frmScrollTop: 85, picScrollTop: 320 },
			memberId: { selected: false, required: false, valid: true, frmScrollTop: 260, picScrollTop: 420 },
			corePlanMonthly: { selected: false, required: false, valid: true, frmScrollTop: 330, picScrollTop: 520 },
			corePlanAnnual: { selected: false, required: false, valid: true, frmScrollTop: 330, picScrollTop: 580 },
			addFiftyStateProtection: { selected: false, required: false, valid: true, frmScrollTop: 400, picScrollTop: 420 },
			addBailBond: { selected: false, required: false, valid: true, frmScrollTop: 470, picScrollTop: 420 },
			addMinorChildren: { selected: false, required: false, valid: true, frmScrollTop: 470, picScrollTop: 420 },
			firstname: { selected: false, required: false, valid: true, frmScrollTop: 540, picScrollTop: 630 },
			lastname: { selected: false, required: false, valid: true, frmScrollTop: 580, picScrollTop: 630 },
			email: { selected: false, required: false, valid: true, frmScrollTop: 645, picScrollTop: 655 },
			phone: { selected: false, required: false, valid: true, frmScrollTop: 710, picScrollTop: 655 },
			mailingAddress: { selected: false, required: false, valid: true, frmScrollTop: 760, picScrollTop: 700 },
			city: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },
			state: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },
			zip: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },// ???
			secMemberId: { selected: false, required: false, valid: true, frmScrollTop: 930, picScrollTop: 900 },
			secCorePlan: { selected: false, required: false, valid: true, frmScrollTop: 1030, picScrollTop: 1100 },
			secAddFiftyStateProtection: { selected: false, required: false, valid: true, frmScrollTop: 1110, picScrollTop: 870 },
			secAddBailBond: { selected: false, required: false, valid: true, frmScrollTop: 1230, picScrollTop: 870 },
			secFirstName: { selected: false, required: false, valid: true, frmScrollTop: 1290, picScrollTop: 1100 },
			secLastName: { selected: false, required: false, valid: true, frmScrollTop: 1330, picScrollTop: 1100 },
			secEmail: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			secPhone: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			priMemTotal: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			secMemTotal: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			startup: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			totalAmount: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			signature: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			dateSignature: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			representation: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			appSource: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			appProcessSwiper: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			facilityCode: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 }
		};

		// 
		maps['FORM_3'] = {};
		maps['FORM_3']['markers'] = {};
		maps['FORM_3']['markers']['credit_card_number'] = { pos: { top: 105 + diviationY, left: 28 + diviationX }, size: { width: 632, height: 49 }, map: 'creditCardNum' };
		maps['FORM_3']['markers']['expiration_date'] = { pos: { top: 105 + diviationY, left: 684 + diviationX }, size: { width: 207, height: 49 }, map: 'expDate' };
		maps['FORM_3']['markers']['cvv'] = { pos: { top: 105 + diviationY, left: 916 + diviationX }, size: { width: 175, height: 49 }, map: 'cvv' };
		maps['FORM_3']['markers']['card_number'] = { pos: { top: 159 + diviationY, left: 378 + diviationX }, size: { width: 300, height: 49 }, map: 'memberId' };
		maps['FORM_3']['markers']['card_number_monthly'] = { pos: { top: 280 + diviationY, left: 26 + diviationX }, size: { width: 284, height: 38 }, map: 'corePlanMonthly' };
		maps['FORM_3']['markers']['card_number_annual'] = { pos: { top: 319 + diviationY, left: 26 + diviationX }, size: { width: 284, height: 38 }, map: 'corePlanMonthly' };
		maps['FORM_3']['markers']['fifty_protect'] = { pos: { top: 215 + diviationY, left: 323 + diviationX }, size: { width: 36, height: 36 }, map: 'addFiftyStateProtection' };
		// maps['FORM_3']['markers']['bailbond'] = { id: 'add-bail-bond', pos: { top: 320 + diviationY, left: 853 + diviationX }, size: { width: 36, height: 36 }, map: 'addBailBond' };
		maps['FORM_3']['markers']['minor_children'] = { pos: { top: 215 + diviationY, left: 544 + diviationX }, size: { width: 36, height: 36 }, map: 'addMinorChildren' };
		maps['FORM_3']['markers']['firstname'] = { pos: { top: 380 + diviationY, left: 28 + diviationX }, size: { width: 440, height: 49 }, map: 'firstname' };
		maps['FORM_3']['markers']['lastname'] = { pos: { top: 380 + diviationY, left: 492 + diviationX }, size: { width: 670, height: 49 }, map: 'lastname' };
		maps['FORM_3']['markers']['email'] = { pos: { top: 440 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'email' };
		maps['FORM_3']['markers']['phone'] = { pos: { top: 610 + diviationY, left: 376 + diviationX }, size: { width: 439, height: 49 }, map: 'phone' };
		maps['FORM_3']['markers']['mailing_address'] = { pos: { top: 495 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'mailingAddress' };
		maps['FORM_3']['markers']['city'] = { pos: { top: 550 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 49 }, map: 'city' };
		maps['FORM_3']['markers']['state'] = { pos: { top: 605 + diviationY, left: 28 + diviationX }, size: { width: 96, height: 49 }, map: 'state' };
		maps['FORM_3']['markers']['zipcode'] = { pos: { top: 605 + diviationY, left: 146 + diviationX }, size: { width: 210, height: 49 }, map: 'zip' };
		maps['FORM_3']['markers']['sec_card_number'] = { pos: { top: 668 + diviationY, left: 835 + diviationX }, size: { width: 310, height: 49 }, map: 'secMemberId' };
		maps['FORM_3']['markers']['sec_monthly'] = { pos: { top: 785 + diviationY, left: 40 + diviationX }, size: { width: 284, height: 38 }, map: 'secCorePlan' };
		maps['FORM_3']['markers']['sec_annual'] = { pos: { top: 820 + diviationY, left: 40 + diviationX }, size: { width: 284, height: 38 }, map: 'secCorePlan' };
		maps['FORM_3']['markers']['sec_50_protection'] = { pos: { top: 722 + diviationY, left: 350 + diviationX }, size: { width: 36, height: 36 }, map: 'secAddFiftyStateProtection' };
		// maps['FORM_3']['markers']['sec_bailbond'] = { pos: { top: 866 + diviationY, left: 1150 + diviationX }, size: { width: 36, height: 36 }, map: 'secAddBailBond' };
		maps['FORM_3']['markers']['sec_firstname'] = { pos: { top: 898 + diviationY, left: 28 + diviationX }, size: { width: 438, height: 38 }, map: 'secFirstName' };
		maps['FORM_3']['markers']['sec_lastname'] = { pos: { top: 898 + diviationY, left: 492 + diviationX }, size: { width: 668, height: 38 }, map: 'secLastName' };
		maps['FORM_3']['markers']['sec_email'] = { pos: { top: 955 + diviationY, left: 28 + diviationX }, size: { width: 1134, height: 38 }, map: 'secEmail' };
		maps['FORM_3']['markers']['sec_phone'] = { pos: { top: 1010 + diviationY, left: 28 + diviationX }, size: { width: 440, height: 38 }, map: 'secPhone' };
		// maps['FORM_3']['markers']['pri_total'] = { pos: { top: 1310 + diviationY, left: 259 + diviationX }, size: { width: 177, height: 49 }, map: 'priMemTotal' };
		// maps['FORM_3']['markers']['sec_total'] = { pos: { top: 1310 + diviationY, left: 565 + diviationX }, size: { width: 152, height: 49 }, map: 'secMemTotal' };
		maps['FORM_3']['markers']['startup'] = { pos: { top: 1015 + diviationY, left: 730 + diviationX }, size: { width: 168, height: 49 }, map: 'startup' };
		maps['FORM_3']['markers']['total'] = { pos: { top: 1015 + diviationY, left: 982 + diviationX }, size: { width: 208, height: 49 }, map: 'totalAmount' };
		maps['FORM_3']['markers']['signature'] = { pos: { top: 1295 + diviationY, left: 120 + diviationX }, size: { width: 576, height: 49 }, map: 'signature' };
		maps['FORM_3']['markers']['date'] = { pos: { top: 1295 + diviationY, left: 767 + diviationX }, size: { width: 402, height: 49 }, map: 'dateSignature' };
		maps['FORM_3']['markers']['representative_code'] = { pos: { top: 1510 + diviationY, left: 8 + diviationX }, size: { width: 290, height: 65 }, map: 'representation' };
		maps['FORM_3']['markers']['app_source_class'] = { pos: { top: 1510 + diviationY, left: 308 + diviationX }, size: { width: 290, height: 55 }, map: 'appSource' };
		maps['FORM_3']['markers']['swiper_no'] = { pos: { top: 1510 + diviationY, left: 612 + diviationX }, size: { width: 290, height: 55 }, map: 'appProcessSwiper' };
		maps['FORM_3']['markers']['swiper_yes'] = { pos: { top: 1510 + diviationY, left: 612 + diviationX }, size: { width: 290, height: 55 }, map: 'appProcessSwiper' };
		maps['FORM_3']['markers']['facility_code'] = { pos: { top: 1510 + diviationY, left: 908 + diviationX }, size: { width: 290, height: 55 }, map: 'facilityCode' };

		maps['FORM_3']['mapping'] = {
			creditCardNum: { selected: false, required: false, valid: true, frmScrollTop: 0, picScrollTop: 320 },
			expDate: { selected: false, required: false, valid: true, frmScrollTop: 40, picScrollTop: 320 },
			cvv: { selected: false, required: false, valid: true, frmScrollTop: 85, picScrollTop: 320 },
			memberId: { selected: false, required: false, valid: true, frmScrollTop: 260, picScrollTop: 420 },
			corePlanMonthly: { selected: false, required: false, valid: true, frmScrollTop: 330, picScrollTop: 520 },
			corePlanAnnual: { selected: false, required: false, valid: true, frmScrollTop: 330, picScrollTop: 580 },
			addFiftyStateProtection: { selected: false, required: false, valid: true, frmScrollTop: 400, picScrollTop: 420 },
			// addBailBond: { selected: false, required: false, valid: true, frmScrollTop: 470, picScrollTop: 420 },
			addMinorChildren: { selected: false, required: false, valid: true, frmScrollTop: 470, picScrollTop: 420 },
			firstname: { selected: false, required: false, valid: true, frmScrollTop: 540, picScrollTop: 630 },
			lastname: { selected: false, required: false, valid: true, frmScrollTop: 580, picScrollTop: 630 },
			email: { selected: false, required: false, valid: true, frmScrollTop: 645, picScrollTop: 655 },
			phone: { selected: false, required: false, valid: true, frmScrollTop: 710, picScrollTop: 655 },
			mailingAddress: { selected: false, required: false, valid: true, frmScrollTop: 760, picScrollTop: 700 },
			city: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },
			state: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },
			zip: { selected: false, required: false, valid: true, frmScrollTop: 810, picScrollTop: 745 },// ???
			secMemberId: { selected: false, required: false, valid: true, frmScrollTop: 930, picScrollTop: 900 },
			secCorePlan: { selected: false, required: false, valid: true, frmScrollTop: 1030, picScrollTop: 1100 },
			secAddFiftyStateProtection: { selected: false, required: false, valid: true, frmScrollTop: 1110, picScrollTop: 870 },
			// secAddBailBond: { selected: false, required: false, valid: true, frmScrollTop: 1230, picScrollTop: 870 },
			secFirstName: { selected: false, required: false, valid: true, frmScrollTop: 1290, picScrollTop: 1100 },
			secLastName: { selected: false, required: false, valid: true, frmScrollTop: 1330, picScrollTop: 1100 },
			secEmail: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			secPhone: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			// priMemTotal: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			// secMemTotal: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			startup: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			totalAmount: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			signature: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			dateSignature: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			representation: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			appSource: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			appProcessSwiper: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 },
			facilityCode: { selected: false, required: false, valid: true, frmScrollTop: 1400, picScrollTop: 1100 }
		};
		/* jshint ignore:end */
		return { getFrmSettings: getFrmSettings, fieldsMap: fieldsMap };
	}]);
})();