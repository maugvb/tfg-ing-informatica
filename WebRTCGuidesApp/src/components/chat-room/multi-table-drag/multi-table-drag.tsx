import React, { useCallback, useEffect, useState } from 'react'
import { Table, Row, Col, Card, Empty } from 'antd'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'

import {
  AiOutlineAudio,
  AiOutlineAudioMuted,
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiFillWechat,
  AiFillDelete
} from 'react-icons/ai'

/**
  const dataMock = {
    items: [
      { id: '0', display: 'Item 0' },
      { id: '1', display: 'Item 1' },
      { id: '2', display: 'Item 2' },
      { id: '3', display: 'Item 3' },
      { id: '4', display: 'Item 4' },
      { id: '5', display: 'Item 5' },
    ],
    roomIds: ['room1', 'room2'],
    rooms: [
      {
        id: 'room1',
        title: 'Room 1',
        itemIds: ['0', '1', '2', '3'],
      },
      {
        id: 'room2',
        title: 'Room 2',
        itemIds: ['4', '5'],
      },
    ],
  }
**/

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
const PRIMARY_BUTTON_NUMBER = 0

interface MultiTableDragProps {
  data
  destroyRoom
  mute
  unmute
  onClickSwitchRoom
  orderSwitchRoom
  isGuide
  selectVideo
  user
  currentRoomId
  selectedUsers
}

const MultiTableDrag: React.FC<MultiTableDragProps> = ({
  data,
  destroyRoom,
  mute,
  unmute,
  onClickSwitchRoom,
  orderSwitchRoom,
  isGuide,
  selectVideo,
  user,
  currentRoomId,
  selectedUsers
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [draggingItemId, setDraggingItemId] = useState(null)
  const getTableColumns = () => {
    const columns: Array<any> = []
    if (data) {
      for (let i = 0; i < data.roomIds.length; i++) {
        columns[i] = [
          {
            title: getRoomName(data.rooms[i].title),
            key: 'id',
            render: record => getUserName(record)
          },
          {
            title: getRoomActions(data.rooms[i].id, data.rooms[i].title),
            key: 'id',
            render: record => getUserActions(record, Number(data.rooms[i].id))
          }
        ]
      }
    }
    return columns
  }

  const getRoomName = title => {
    return (
      <>
        <span>
          <AiFillWechat className="room-icon" />
        </span>
        <span className={'room-name' + (isGuide ? ' guide' : '')} onClick={isGuide ? onClickSwitchRoom : () => {}}>
          {title}
        </span>
      </>
    )
  }

  const getRoomActions = (id, title) => {
    return (
      isGuide &&
      !(title === 'Hall') && <AiFillDelete className="delete-icon" id={'delete-' + id} onClick={destroyRoom} />
    )
  }

  const getUserName = record => {
    return <span className={record.id === user.id ? 'bold-text' : ''}>{record.display}</span>
  }

  const getUserActions = (record, roomId) => {
    return (
      <>
        {getMuteIcon(record)}
        {getCameraIcon(record, roomId)}
      </>
    )
  }

  const getMuteIcon = record => {
    return record.muted ? (
      <AiOutlineAudioMuted className="mute-icon" id={'mute-' + record.id} />
    ) : (
      <AiOutlineAudio className="mute-icon" id={'mute-' + record.id} onClick={isGuide ? mute : () => {}} />
    )
  }

  const getCameraIcon = (record, roomId) => {
    if (isGuide && roomId === currentRoomId && record.id !== user.id && record.publisher) {
      return selectedUsers.includes(record.videoId) ? (
        <AiOutlineEyeInvisible className="view-icon" id={'view-' + record.id} onClick={selectVideo} />
      ) : (
        <AiOutlineEye className="view-icon" id={'view-' + record.id} onClick={selectVideo} />
      )
    } else {
      return ''
    }
  }

  /**
   * On window click
   */
  const onWindowClick = useCallback(e => {
    if (e.defaultPrevented) {
      return
    }

    setSelectedItemIds([])
  }, [])

  /**
   * On window key down
   */
  const onWindowKeyDown = useCallback(e => {
    if (e.defaultPrevented) {
      return
    }

    if (e.key === 'Escape') {
      setSelectedItemIds([])
    }
  }, [])

  /**
   * On window touch end
   */
  const onWindowTouchEnd = useCallback(e => {
    if (e.defaultPrevented) {
      return
    }

    setSelectedItemIds([])
  }, [])

  /**
   * Event Listener
   */
  useEffect(() => {
    window.addEventListener('click', onWindowClick)
    window.addEventListener('touchend', onWindowTouchEnd)
    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('click', onWindowClick)
      window.removeEventListener('touchend', onWindowTouchEnd)
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [onWindowClick, onWindowKeyDown, onWindowTouchEnd])

  /**
   * Droppable table body
   */
  const DroppableTableBody = ({ roomId, ...props }) => {
    return (
      <Droppable
        droppableId={roomId.toString()}
        // isDropDisabled={roomId === 'todo'}
      >
        {(provided, snapshot) => (
          <tbody
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`${props.className} ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
          >
            {props.children}
            {provided.placeholder}
          </tbody>
        )}
      </Droppable>
    )
  }

  /**
   * Draggable table row
   */
  const DraggableTableRow = ({ index, record, items, ...props }) => {
    if (!items.length) {
      return (
        <tr className="ant-table-placeholder row-item" {...props}>
          <td colSpan={getTableColumns().length} className="ant-table-cell">
            <div className="ant-empty ant-empty-normal">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          </td>
        </tr>
      )
    }

    return (
      <Draggable
        key={props['data-row-key']}
        draggableId={props['data-row-key'].toString()}
        index={index}
        isDragDisabled={!isGuide}
      >
        {(provided, snapshot) => {
          return (
            <tr
              ref={provided.innerRef}
              {...props}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`row-item ${snapshot.isDragging ? 'row-dragging' : ''}`}
            ></tr>
          )
        }}
      </Draggable>
    )
  }

  /**
   * Get items
   */
  const getItems = (pData, id) => {
    // Get the items
    const dat = pData.rooms[id].itemIds.map(itemId => pData.items.find(item => item.id === itemId))
    // Add a key to all items (their audioId)
    return dat.map(item => {
      item.key = item.id
      return item
    })
  }

  /**
   * On before capture
   */
  const onBeforeCapture = start => {
    const draggableId = start.draggableId
    const selected = selectedItemIds.find(itemId => itemId === draggableId)

    // if dragging an item that is not selected - unselect all items
    if (!selected) {
      setSelectedItemIds([])
    }

    setDraggingItemId(draggableId)
  }

  /**
   * On drag end
   */
  const onDragEnd = result => {
    const destination = result.destination
    const source = result.source

    // nothing to do
    if (
      !destination ||
      result.reason === 'CANCEL' ||
      (source &&
        source.droppableId &&
        destination &&
        destination.droppableId &&
        source.droppableId === destination.droppableId)
    ) {
      setDraggingItemId(null)
      return
    }

    // const processed = mutliDragAwareReorder({
    //   data,
    //   selectedItemIds,
    //   source,
    //   destination
    // })

    orderSwitchRoom(draggingItemId, source, destination)
    setDraggingItemId(null)
  }

  /**
   * Toggle selection
   */
  // const toggleSelection = (itemId: string) => {
  //   console.log('toggleSelection')

  //   const wasSelected = selectedItemIds.includes(itemId)

  //   const newItemIds = (() => {
  //     // Item was not previously selected
  //     // now will be the only selected item
  //     if (!wasSelected) {
  //       return [itemId]
  //     }

  //     // Item was part of a selected group
  //     // will now become the only selected item
  //     if (selectedItemIds.length > 1) {
  //       return [itemId]
  //     }

  //     // item was previously selected but not in a group
  //     // we will now clear the selection
  //     return []
  //   })()
  //   setSelectedItemIds(newItemIds)
  // }

  /**
   * Toggle selection in group
   */
  const toggleSelectionInGroup = itemId => {
    const index = selectedItemIds.indexOf(itemId)

    // if not selected - add it to the selected items
    if (index === -1) {
      setSelectedItemIds([...selectedItemIds, itemId])

      return
    }

    // it was previously selected and now needs to be removed from the group
    const shallow = [...selectedItemIds]
    shallow.splice(index, 1)
    setSelectedItemIds(shallow)
  }

  /**
   * Multi select to
   * This behaviour matches the MacOSX finder selection
   */
  // const multiSelectTo = (newItemId) => {
  //   const updated = multiSelect(data, selectedItemIds, newItemId)

  //   if (updated == null) {
  //     return
  //   }

  //   setSelectedItemIds(updated)
  // }

  /**
   * On click to row
   * Using onClick as it will be correctly
   * preventing if there was a drag
   */
  const onClickRow = e => {
    if (e.defaultPrevented) {
      return
    }

    if (e.button !== PRIMARY_BUTTON_NUMBER) {
      return
    }

    // marking the event as used
    e.preventDefault()
    // performAction(e, record) // selection disabled
  }

  /**
   * On touch end from row
   */
  const onTouchEndRow = (e, record) => {
    if (e.defaultPrevented) {
      return
    }

    // marking the event as used
    // we would also need to add some extra logic to prevent the click
    // if this element was an anchor
    e.preventDefault()
    toggleSelectionInGroup(record.id)
  }

  /**
   * Was toggle in selection group key used
   * Determines if the platform specific toggle selection in group key was used
   */
  // const wasToggleInSelectionGroupKeyUsed = (e) => {
  //   const isUsingWindows = navigator.platform.indexOf('Win') >= 0
  //   return isUsingWindows ? e.ctrlKey : e.metaKey
  // }

  /**
   * Was multi select key used
   * Determines if the multiSelect key was used
   */
  // const wasMultiSelectKeyUsed = (e) => e.shiftKey

  /**
   * Perform action
   */
  // const performAction = (e, record) => {
  //   if (wasToggleInSelectionGroupKeyUsed(e)) {
  //     toggleSelectionInGroup(record.id)
  //     return
  //   }

  //   if (wasMultiSelectKeyUsed(e)) {
  //     multiSelectTo(record.id)
  //     return
  //   }

  //   toggleSelection(record.id)
  // }

  return (
    <>
      <Card className={`c-multi-drag-table ${draggingItemId ? 'is-dragging' : ''}`}>
        <DragDropContext onBeforeCapture={onBeforeCapture} onDragEnd={onDragEnd}>
          <Row gutter={40}>
            {data.rooms.map(room => {
              return (
                <Col key={room.id} xs={12}>
                  <div key={'div-' + room.id} className="inner-col">
                    <Table
                      dataSource={getItems(
                        data,
                        data.rooms.findIndex(r => r.id === room.id)
                      )}
                      columns={getTableColumns()[data.rooms.findIndex(r => r.id === room.id)]}
                      rowKey="id"
                      pagination={false}
                      components={{
                        body: {
                          // Custom tbody
                          wrapper: val =>
                            DroppableTableBody({
                              roomId: room.id,
                              items: getItems(
                                data,
                                data.rooms.findIndex(r => r.id === room.id)
                              ),
                              ...val
                            }),
                          // Custom td
                          row: val =>
                            DraggableTableRow({
                              items: getItems(
                                data,
                                data.rooms.findIndex(r => r.id === room.id)
                              ),
                              ...val
                            })
                        }
                      }}
                      // Set props on per row (td)
                      onRow={(record, index) => ({
                        index,
                        record,
                        onClick: e => onClickRow(e),
                        onTouchEnd: e => onTouchEndRow(e, record)
                      })}
                    />
                  </div>
                </Col>
              )
            })}
          </Row>
          <br />
        </DragDropContext>
      </Card>
    </>
  )
}

export default React.memo(MultiTableDrag)
