import React from 'react';
import ListSection from '../map/listSection-Component';

import './sidebar.scss'
import anchorIcon from '../map/images/sensor.png'
import tagIcon from '../map/images/test.png'
import roomIcon from '../map/images/rectangle.png'


// Sidebar component
const Sidebar = (props) => {

    const userDisplay = props.username.replace('guide__', '')
    return (
        <div className="sidebarComponent">
            <div className="sidebar-header">
                <h3 className='title-sidebar-map'>Guides: <span className='underline'>{userDisplay}</span></h3>
            </div>
            <div className="sidebar-body">
                {
                    props.isEditRoom ? <ListSection icon={anchorIcon} isEditRoom={props.isEditRoom} isRoom={true}  elements={[]} headerSection="Rooms"></ListSection>:
                    <>
                        <ListSection icon={tagIcon} isRoom={false} isEditRoom={props.isEditRoom}  elements={props.tags} headerSection="Tags"></ListSection>
                        <ListSection icon={roomIcon} isRoom={true} isEditRoom={props.isEditRoom}  elements={[]} headerSection="Rooms"></ListSection>
                        <ListSection icon={anchorIcon} isRoom={false} isEditRoom={props.isEditRoom}  elements={props.anchors}  headerSection="Anchors"/>

                    </>
                   
                }
                
            </div>
        </div>
    )

}

export default Sidebar;