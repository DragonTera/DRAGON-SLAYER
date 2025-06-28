'use strict'

const SettingsUI = require('tera-mod-ui').Settings;

const TAG = "<font color='#04ACEC'>DRAGON-SLAYER:</font> ";

const JOB_SLAYER            = 2;

const S_COMBO_ATTACK_0      = 11200;    //BLACK LIST
const S_COMBO_ATTACK_1      = 11201;    //BLACK LIST
const S_COMBO_ATTACK_2      = 11202;    //BLACK LIST
const S_COMBO_ATTACK_3      = 11203;    //BLACK LIST

const S_KNOCKDOWN_STRIKE_0  = 21100;
const S_KNOCKDOWN_STRIKE_1  = 21101;
const S_KNOCKDOWN_STRIKE_2  = 21102;    //SAVAGE INDICATOR
const S_KNOCKDOWN_STRIKE_3  = 21130;    //MAX SPEED

const S_WHIRLWIND_0         = 31100;
const S_WHIRLWIND_1         = 31101;
const S_WHIRLWIND_2         = 31102;    //SAVAGE INDICATOR
const S_WHIRLWIND_3         = 31130;    //MAX SPEED

const S_EVASIVE_ROLL_0      = 40200;    //BLACK LIST
const S_EVASIVE_ROLL_1      = 40230;    //BLACK LIST

const S_DASH                = 50300;

const S_BACKSTAB            = 60200;    //BLACK LIST

const S_OVERHAND_STRIKE_0   = 81000;
const S_OVERHAND_STRIKE_1   = 81030;    //MAX SPEED

const S_LEAPING_STRIKE      = 90800;

const S_HEART_THRUST_0      = 121100;
const S_HEART_THRUST_1      = 121101;
const S_HEART_THRUST_2      = 121102;   //SAVAGE INDICATOR
const S_HEART_THRUST_3      = 121130;   //MAX SPEED

const S_STUNNING_BACKHAND   = 130900;

const S_DISTANT_BLADE_0     = 140800;   //BLACK LIST
const S_DISTANT_BLADE_1     = 140801;   //BLACK LIST
const S_DISTANT_BLADE_2     = 140802;   //BLACK LIST

const S_STARTLING_KICK      = 150800;

const S_FURY_STRIKE         = 160400;

const S_HEADLONG_RUSH       = 170300;

const S_OVERPOWER_0         = 180200;
const S_OVERPOWER_1         = 180250;

const S_TENACITY_0          = 190300;
const S_TENACITY_1          = 193300;   //IMORTAL

const S_IN_COLD_BLOOD_0     = 200300;   //BLACK LIST
const S_IN_COLD_BLOOD_1     = 203200;   //BLACK LIST

const S_EXHAUSTING_BLOW     = 210100;

const S_MEASURED_SLICE_0    = 230900;
const S_MEASURED_SLICE_1    = 230930;   //MAX SPEED

const S_EVISCERATE_0        = 240900;
const S_EVISCERATE_1        = 240930;   //MAX SPEED

const S_PUNISHING_BLOW_0    = 260100;
const S_PUNISHING_BLOW_1    = 260130;   //MAX SPEED

const S_SAVAGE_STRIKE_0     = 270100;   //BLACK LIST
const S_SAVAGE_STRIKE_1     = 270130;   //BLACK LIST
const S_SAVAGE_STRIKE_2     = 270131;   //BLACK LIST

const S_UNSHEATHE_0         = 280100;   //BLACK LIST
const S_UNSHEATHE_1         = 280101;   //BLACK LIST
const S_UNSHEATHE_2         = 280102;   //BLACK LIST
const S_UNSHEATHE_3         = 280103;   //BLACK LIST

const OVERHAND_STRIKE_CHAIN = [2, 3, 9, 12, 13, 15, 16, 24];
const EVISCERATE_CHAIN      = [2, 3, 8, 9, 12, 13, 15];
const MEASURED_SLICE_CHAIN  = [8, 24, 26];
const PUNISHING_BLOW_CHAIN  = [8, 23, 24, 27];
const BLACK_LIST            = [1, 4, 14, 20, 27, 28];

const WHITE_LIST            = [11200, 11201, 11202, 11203, 21100, 21101, 21102, 21130, 31100, 31101, 31102, 31130, 40200, 40230, 50300, 60200, 81000, 81030,90800,
                               121100, 121101, 121102, 121130, 130900, 140800, 140801, 140802, 150800, 160400, 170300, 180200, 180250, 190300, 193300, 200300, 203200,
                               210100, 230900, 230930, 240900, 240930, 260100, 260130, 270100, 270130, 270131, 280100, 280101, 280102, 280103];

module.exports = function slayer(mod)
{
    mod.game.initialize(['me', 'me.abnormalities']);

    let job         = null;
    let templateId  = null;
    let playerLoc   = null;
    let playerDest  = null;
    let playerW     = null;

    let mySpeed     = null;

    let atkIdBase   = 0xFEFEFFEE;

    let skillFinish = [];
    let skillCd     = [];
    let taskSkillCd = [];
    let skillBefore = 0;

    let taskMs      = null;

    let moving      = false;
    
    //--------------------------------------------------------------------------------------------------------------------------------------
    //  functions
    //--------------------------------------------------------------------------------------------------------------------------------------
    
    function _SkillTarget(__event, __skill)
    {
        mod.toServer('C_START_TARGETED_SKILL', 7, 
        {
            skill: __skill,
            w: __event.w,
            loc: __event.loc,
            dest: __event.dest,
            targets: [[0, 0]],
        });

        return;
    }

    function _SkillStart(__event, __skill, __continue)
    {
        mod.toServer('C_START_SKILL', 7,
        {
            skill: __skill,
            w: __event.w,
            loc: __event.loc,
            dest: __event.dest,
            unk: true,
            moving: __event.moving,
            continue: __continue,
            target: __event.target,
        });
    
        return;
    }
    
    function _SkillInstance(__event, __skill)
    {
        mod.toServer('C_START_INSTANCE_SKILL', 7, 
        {
            skill: __skill,
            loc: __event.loc,
            w: __event.w,
            continue: __event.continue,
            targets: 
            [{
                arrowId: 0,
                gameId: __event.target,
                hitCylinderId: 0
            }],
            endpoints: 
            [{
                x: __event.dest.x,
                y: __event.dest.y,
                z: __event.dest.z
            }]
        });
        
        return;
    }

    function _SkillStage(__event, __skill, __atkId, __stage)
    {
        mod.toServer('S_ACTION_STAGE', 9, 
        {
            gameId: mod.game.me.gameId,
            loc: __event.loc,
            w: __event.w,
            templateId: templateId,
            skill: __skill,
            stage: __stage,
            speed: mySpeed,
            ...(mod.majorPatchVersion >= 75 ? { projectileSpeed: 1 } : 0n),
            id: __atkId,
            effectScale: 1.0,
            moving: __event.moving,
            dest: __event.dest,
            target: 0n,
            animSeq: [],
        });

        return;
    }

    function _SkillEnd(__event, __atkId, __type)
    {
        mod.toServer('S_ACTION_END', 5, 
        {
            gameId: mod.game.me.gameId,
            loc: __event.loc,
            w: __event.w,
            templateId: templateId,
            skill: __event.skill,
            type: __type,
            id: __atkId,
        });
        
        return;
    }

    function _SkillEndClient(__event, __atkId, __type)
    {
        mod.toClient('S_ACTION_END', 5, 
        {
            gameId: mod.game.me.gameId,
            loc: __event.loc,
            w: __event.w,
            templateId: templateId,
            skill: __event.skill,
            type: __type,
            id: __atkId,
        });
        
        return;
    }

    function _Wisper()
    {
        mod.toClient('S_WHISPER', 3,
        {
            gameId: mod.game.me.gameId,
            isWorldEventTarget: 0,
            gm: 0,
            founder: 0,
            name: "DRAGON_SLAYER",
            recipient: mod.game.me.name,
            message: "Overpoer is not active.",
        });

        return;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Player event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_LOGIN', mod.majorPatchVersion < 114 ? 14 : 15, (event) => 
    {
        templateId  = event.templateId;
        job         = (templateId -10101) % 100;

        if(job != JOB_SLAYER){return;}
        
        setTimeout(function (){mod.command.message('This mod does not work with NGSP, SP or any skill prediction / ping remover.');}, 10000);

        for(let __i = 0; __i < 50; __i++)
        {
            skillFinish[__i]    = true;
            skillCd[__i]        = false;
            taskSkillCd[__i]    = null;
        }
        
        skillBefore = 0;

        return;
    });

    mod.hook("C_PLAYER_LOCATION", 5, event =>
    {
		playerLoc   = event.loc;
		playerW     = event.w;
        playerDest  = event.dest;
	});

    mod.hook('S_PLAYER_STAT_UPDATE', mod.majorPatchVersion < 105 ? 14 : (mod.majorPatchVersion < 108 ? 15 : 17), (event) =>
    {
        if(job != JOB_SLAYER || mod.settings.ENABLE == false){return;}

        mySpeed = (event.attackSpeedBonus + event.attackSpeed) / event.attackSpeed;

        return;
    });

    mod.game.on('leave_game', () => 
    {
        for(let __i = 0; __i < 50; __i++)
        {
            clearInterval(taskSkillCd[__i]);
        }

        clearInterval(taskMs);
    });
    
    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Cooldown skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_START_COOLTIME_SKILL', mod.majorPatchVersion < 114 ? 3 : 4, (event) =>
    {
        if(job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'S_START_COOLTIME_SKILL: ' + event.skill.id + ' / ' + event.cooldown + ' | ' + Math.floor(event.skill.id / 10000));}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        skillCd[Math.floor(event.skill.id / 10000)] = true;
        clearInterval(taskSkillCd[Math.floor(event.skill.id / 10000)]);
        taskSkillCd[Math.floor(event.skill.id / 10000)] = setTimeout(function (){skillCd[Math.floor(event.skill.id / 10000)] = false;}, event.cooldown);

        return;
	});

    mod.hook('S_DECREASE_COOLTIME_SKILL', 3, (event) => 
    {
        if(job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'S_DECREASE_COOLTIME_SKILL: ' + event.skill.id + ' / ' + event.cooldown + ' | ' + Math.floor(event.skill.id / 10000));}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        skillCd[Math.floor(event.skill.id / 10000)] = true;
        clearInterval(taskSkillCd[Math.floor(event.skill.id / 10000)]);
        taskSkillCd[Math.floor(event.skill.id / 10000)] = setTimeout(function (){skillCd[Math.floor(event.skill.id / 10000)] = false;}, event.cooldown);

        return;
	});

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Use skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('C_START_SKILL', 7, (event) =>
    {
        if(job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'C_START_SKILL: ' + event.skill.id + ' | ' + event.continue + ' | ' + event.unk + ' | ' + event.skill.npc);}
        if(mod.settings.ENABLE == false){return;}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        skillFinish[Math.floor(event.skill.id / 10000)] = false;

        moving = event.moving;
        
        if(event.skill.id != S_OVERPOWER_0 && event.skill.id != S_OVERPOWER_1 && mod.settings.OVERPOWER_NOTIFY == true)
        {
            let __wisper = true;

            Object.values(mod.game.me.abnormalities).forEach(abnormality => 
            {
                if(abnormality.data.name == "Overpowered")
                {
                    __wisper = false;
                    return;
                }
            });
            
            if(__wisper == true){_Wisper();}
        }

        if(event.skill.id == S_KNOCKDOWN_STRIKE_0 || event.skill.id == S_KNOCKDOWN_STRIKE_1 || event.skill.id == S_KNOCKDOWN_STRIKE_2 || event.skill.id == S_KNOCKDOWN_STRIKE_3)
        {
            if(mod.settings.KNOCKDOWN_FAST == true)
            {
                let __event = event;
                __event.skill.id = S_KNOCKDOWN_STRIKE_3;
                _SkillInstance(__event, __event.skill);
            }
        }
        else if(event.skill.id == S_WHIRLWIND_0 || event.skill.id == S_WHIRLWIND_1 || event.skill.id == S_WHIRLWIND_2 || event.skill.id == S_WHIRLWIND_3)
        {
            if(skillCd[Math.floor(S_HEADLONG_RUSH / 10000)] == false && mod.settings.FORCE_HEADLONG_RUSH == true)
            {
                _SkillTarget(event, S_HEADLONG_RUSH);
                setTimeout(function (){_SkillStart(event, event.skill.id, true);}, 50 / mySpeed);
            }
        }
        else if(event.skill.id == S_OVERHAND_STRIKE_0 || event.skill.id == S_OVERHAND_STRIKE_1)
        {
            if(OVERHAND_STRIKE_CHAIN.includes(skillBefore) == true && skillFinish[skillBefore] == false)
            {
                let __event      = event;
                __event.skill.id = S_OVERHAND_STRIKE_1;
                _SkillInstance(__event, __event.skill);
            }
            else
            {
                atkIdBase--;
                
                if(atkIdBase < 100){atkIdBase = 0xFEFEFFEE;}

                _SkillStart(event, S_OVERHAND_STRIKE_0, true);
                _SkillStage(event, S_OVERHAND_STRIKE_1, atkIdBase, 0);
                _SkillEnd(event, atkIdBase, 4);
            }
        }
        else if(event.skill.id == S_MEASURED_SLICE_0 || event.skill.id == S_MEASURED_SLICE_1)
        {
            if(skillCd[Math.floor(S_PUNISHING_BLOW_0 / 10000)] == false && mod.settings.FORCE_PUNISHING_BLOW == true)
            {
                skillFinish[Math.floor(S_PUNISHING_BLOW_0 / 10000)] = false;
                
                let __event      = event;
                __event.skill.id = S_PUNISHING_BLOW_0;

                _SkillStart(__event, __event.skill, true);
                
                if(mod.settings.AUTO_MEASURED_SLICE == true)
                {
                    clearInterval(taskMs);
                    taskMs = setInterval(function ()
                    {
                        if(skillFinish[Math.floor(S_PUNISHING_BLOW_0 / 10000)] == true || skillFinish[Math.floor(S_MEASURED_SLICE_0 / 10000)] == true)
                        {
                            clearInterval(taskMs);
                            return;
                        }
                        else if(skillCd[Math.floor(S_PUNISHING_BLOW_0 / 10000)] == true)
                        {
                            __event.skill.id = S_MEASURED_SLICE_0;
                            _SkillStart(__event, __event.skill, true);
                        }
                    }, 20);
                }
            }
            else if(MEASURED_SLICE_CHAIN.includes(skillBefore) == true && skillFinish[skillBefore] == false)
            {   
                let __event      = event;
                __event.skill.id = S_MEASURED_SLICE_1;
                _SkillInstance(__event, __event.skill);
            }
        }
        else if(event.skill.id == S_EVISCERATE_0 || event.skill.id == S_EVISCERATE_1)
        {
            if(EVISCERATE_CHAIN.includes(skillBefore) == true && skillFinish[skillBefore] == false)
            {   
                let __event      = event;
                __event.skill.id = S_EVISCERATE_1;
                _SkillInstance(__event, __event.skill);
            }
        }
        else if(event.skill.id == S_PUNISHING_BLOW_0 || event.skill.id == S_PUNISHING_BLOW_1)
        {
            if(PUNISHING_BLOW_CHAIN.includes(skillBefore) == true && skillFinish[skillBefore] == false)
            {   
                let __event      = event;
                __event.skill.id = S_PUNISHING_BLOW_1;
                _SkillInstance(__event, __event.skill);
            }
        }
        else if(event.skill.id == S_SAVAGE_STRIKE_0)
        {
            if(skillCd[Math.floor(S_HEADLONG_RUSH / 10000)] == false)
            {
                skillCd[Math.floor(S_HEADLONG_RUSH / 10000)] = true;
                clearInterval(taskSkillCd[Math.floor(S_HEADLONG_RUSH / 10000)]);
                taskSkillCd[Math.floor(S_HEADLONG_RUSH / 10000)] = setTimeout(function (){skillCd[Math.floor(S_HEADLONG_RUSH / 10000)] = false;}, 1000);
            }
        }
        else if(BLACK_LIST.includes(Math.floor(event.skill.id / 10000)) == false)
        {
            _SkillInstance(event, event.skill);
        }
        
        skillBefore = Math.floor(event.skill.id / 10000);
        return;
    });

    mod.hook('C_PRESS_SKILL', 4, (event) => 
    {
        if(job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'C_PRESS_SKILL: ' + event.skill.id);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        return;
	});

    mod.hook('C_START_INSTANCE_SKILL', 7, (event) =>
    {
        if(job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'C_START_INSTANCE_SKILL: ' + event.skill.id);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        return;
    });

    mod.hook('S_ACTION_STAGE', 9, (event) =>
    {
        if(mod.game.me.gameId != event.gameId || job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'S_ACTION_STAGE: ' + event.skill.id + ' | ' + event.stage);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        if(event.skill.id == S_SAVAGE_STRIKE_0 || event.skill.id == S_SAVAGE_STRIKE_1 || event.skill.id == S_SAVAGE_STRIKE_2)
        {
            if(mod.settings.SAVAGE_STRIKE_CANCEL_AWSD == true && moving == true)
            {
                return;
            }
            else if(mod.settings.SAVAGE_STRIKE_CANCEL == true)
            {
                _SkillEndClient(event, event.id, 4);
            }
            else if(mod.settings.SAVAGE_STRIKE_DOUBLE == true && (event.skill.id == S_SAVAGE_STRIKE_0 || event.skill.id == S_SAVAGE_STRIKE_1))
            {
                let __event     = event;
                __event.loc     = playerLoc;
                __event.skill   = S_SAVAGE_STRIKE_0;
                __event.w       = __event.w > 0 ? __event.w - Math.PI : __event.w + Math.PI;

                setTimeout(function ()
                {
                    _SkillStart(__event, __event.skill, true);
                }, mod.settings.SAVAGE_STRIKE_DELAY / mySpeed);
            }
        }

        return;
    });

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  End skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_ACTION_END', 5, (event) =>
    {
        if(mod.game.me.gameId != event.gameId || job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'S_ACTION_END: ' + event.skill.id + ' | ' + event.type + ' | ' + event.id);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        skillFinish[Math.floor(event.skill.id / 10000)] = true;

        return;
    });

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Interface
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.command.add(['slayer'], () =>
    {
        if(ui){ui.show();}
    });

    let ui = null;
    if(global.TeraProxy.GUIMode)
    {
        ui = new SettingsUI(mod, require('./settings_structure'), mod.settings, {height: 355, width: 720});
        
        ui.on('update', settings => 
        {
            mod.settings = settings;
        });

        this.destructor = () => 
        {
            if(ui)
            {
                ui.close();
                ui = null;
            }
        };
    }
}